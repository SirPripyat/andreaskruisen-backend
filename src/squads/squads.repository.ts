import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  Formation,
  PositionCode,
  PreferredFoot,
  PrismaClient,
  Squad,
} from '../../generated/prisma/client';

export interface RosterPlayer {
  id: string;
  name: string;
  photoUrl: string;
  birthdate: Date;
  position: PositionCode;
  overallRating: number;
  preferredFoot: PreferredFoot;
  nationality: { id: string; name: string; flagUrl: string };
  isStarter: boolean;
}

export interface LineupOverview {
  formation: Formation | null;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
}

export interface RosterBySector {
  goalkeepers: RosterPlayer[];
  defenders: RosterPlayer[];
  midfielders: RosterPlayer[];
  attackers: RosterPlayer[];
}

// Mesmo agrupamento usado nas médias por setor de TeamsRepository
// (averageDefenseRating etc.), pra ficar consistente com o resto da API. A
// ordem dentro de cada array é a ordem de exibição das posições dentro do
// setor (ex.: meio-campo do mais ofensivo, MEI, ao mais defensivo, VOL).
const SECTOR_POSITIONS: { key: keyof RosterBySector; positions: PositionCode[] }[] =
  [
    { key: 'goalkeepers', positions: ['GOL'] },
    { key: 'defenders', positions: ['ZAG', 'LD', 'LE'] },
    { key: 'midfielders', positions: ['MEI', 'ME', 'MD', 'MC', 'VOL'] },
    { key: 'attackers', positions: ['PD', 'ATA', 'PE'] },
  ];

// Dentro de cada setor: agrupado por posição (ordem de SECTOR_POSITIONS),
// e dentro da mesma posição, titulares primeiro e depois por overall (maior
// pra menor) — nunca intercala posições diferentes.
export function groupBySector(players: RosterPlayer[]): RosterBySector {
  const bySector = {} as RosterBySector;

  for (const { key, positions } of SECTOR_POSITIONS) {
    bySector[key] = players
      .filter((player) => positions.includes(player.position))
      .sort(
        (a, b) =>
          positions.indexOf(a.position) - positions.indexOf(b.position) ||
          Number(b.isStarter) - Number(a.isStarter) ||
          b.overallRating - a.overallRating,
      );
  }

  return bySector;
}

// Pools de posição usados pra limitar o banco a, no máximo, 7 reservas (os
// de maior overall em cada pool), em vez do elenco reserva inteiro. Cada
// pool agrupa posições próximas pra que a falta de um reserva numa posição
// específica (ex.: nenhum ATA sobrando) seja naturalmente coberta por outra
// do mesmo pool (ex.: PD/PE), em vez de deixar a vaga vazia.
const BENCH_POSITION_POOLS: { positions: PositionCode[]; take: number }[] = [
  { positions: ['GOL'], take: 1 },
  { positions: ['ZAG', 'LD', 'LE'], take: 2 },
  { positions: ['VOL', 'MC', 'MEI'], take: 2 },
  { positions: ['PE', 'ATA', 'PD'], take: 2 },
];

// Ordem de exibição (titulares e banco): goleiro, defesa, meio, ataque —
// mesma ordem de declaração do enum PositionCode no schema.
const POSITION_DISPLAY_ORDER = new Map<PositionCode, number>(
  [
    'GOL',
    'ZAG',
    'LD',
    'LE',
    'VOL',
    'MC',
    'MD',
    'ME',
    'MEI',
    'PD',
    'PE',
    'ATA',
  ].map((position, index) => [position as PositionCode, index]),
);

function sortByPosition(players: RosterPlayer[]): RosterPlayer[] {
  return [...players].sort(
    (a, b) =>
      (POSITION_DISPLAY_ORDER.get(a.position) ?? 0) -
      (POSITION_DISPLAY_ORDER.get(b.position) ?? 0),
  );
}

export interface SquadWithRelations extends Squad {
  user: { id: string; name: string };
  team: {
    id: string;
    name: string;
    crestUrl: string;
    league: { id: string; name: string };
  };
}

@Injectable()
export class SquadsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findAllForSeason(seasonId: string): Promise<SquadWithRelations[]> {
    return this.txHost.tx.squad.findMany({
      where: { seasonId },
      include: {
        user: { select: { id: true, name: true } },
        team: {
          select: {
            id: true,
            name: true,
            crestUrl: true,
            league: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  create(data: {
    seasonId: string;
    userId: string;
    teamId: string;
  }): Promise<Squad> {
    return this.txHost.tx.squad.create({ data });
  }

  findByUserAndSeason(userId: string, seasonId: string): Promise<Squad | null> {
    return this.txHost.tx.squad.findUnique({
      where: { seasonId_userId: { seasonId, userId } },
    });
  }

  findByTeamAndSeason(teamId: string, seasonId: string): Promise<Squad | null> {
    return this.txHost.tx.squad.findUnique({
      where: { seasonId_teamId: { seasonId, teamId } },
    });
  }

  async findRoster(seasonId: string, teamId: string): Promise<RosterPlayer[]> {
    const assignments = await this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, teamId },
      select: {
        isStarter: true,
        player: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            birthdate: true,
            preferredFoot: true,
            latestOverallRating: true,
            nationality: { select: { id: true, name: true, flagUrl: true } },
            positions: { select: { position: true, isPrimary: true } },
          },
        },
      },
    });

    return assignments.map(({ player, isStarter }) => {
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      return {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        birthdate: player.birthdate,
        position: primary?.position ?? 'ATA',
        overallRating: player.latestOverallRating,
        preferredFoot: player.preferredFoot,
        nationality: player.nationality,
        isStarter,
      };
    });
  }

  // Separa o elenco da temporada em titulares e banco, pra que o front não
  // precise buscar dois endpoints e calcular esse diff. "Titular" é um slot
  // do elenco NESSA temporada (PlayerTeamAssignment.isStarter), não um
  // atributo fixo do jogador: começa a partir do TeamLineupSlot real
  // (SoFIFA) quando a temporada é criada, mas numa troca o slot acompanha
  // quem entra/sai (ver TransfersRepository.swap) — por isso o elenco
  // sempre soma exatamente 11 titulares, mesmo depois de trocas.
  async findLineupOverview(
    seasonId: string,
    teamId: string,
  ): Promise<LineupOverview> {
    const [team, assignments] = await Promise.all([
      this.txHost.tx.team.findUnique({
        where: { id: teamId },
        select: { formation: true },
      }),
      this.txHost.tx.playerTeamAssignment.findMany({
        where: { seasonId, teamId },
        select: {
          isStarter: true,
          player: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              birthdate: true,
              preferredFoot: true,
              latestOverallRating: true,
              nationality: { select: { id: true, name: true, flagUrl: true } },
              positions: { select: { position: true, isPrimary: true } },
              // Só pra exibir a posição exata da formação (ex.: MC em vez de
              // VOL) quando o titular ainda é o mesmo de quando a temporada
              // começou; um titular trocado pra esse time não tem esse slot
              // real, então cai pra posição principal do jogador.
              lineupSlots: { select: { position: true }, take: 1 },
            },
          },
        },
      }),
    ]);

    const starters: RosterPlayer[] = [];
    const bench: RosterPlayer[] = [];

    for (const { player, isStarter } of assignments) {
      const lineupSlot = player.lineupSlots[0];
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      const rosterPlayer: RosterPlayer = {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        birthdate: player.birthdate,
        position: lineupSlot?.position ?? primary?.position ?? 'ATA',
        overallRating: player.latestOverallRating,
        preferredFoot: player.preferredFoot,
        nationality: player.nationality,
        isStarter,
      };

      (isStarter ? starters : bench).push(rosterPlayer);
    }

    return {
      formation: team?.formation ?? null,
      starters: sortByPosition(starters),
      bench: sortByPosition(limitBench(bench)),
    };
  }
}

// Reduz o banco aos melhores (maior overall) de cada pool de posição,
// pulando vagas sem jogador disponível no pool.
function limitBench(bench: RosterPlayer[]): RosterPlayer[] {
  return BENCH_POSITION_POOLS.flatMap(({ positions, take }) =>
    bench
      .filter((player) => positions.includes(player.position))
      .sort((a, b) => b.overallRating - a.overallRating)
      .slice(0, take),
  );
}
