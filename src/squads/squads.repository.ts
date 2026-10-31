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
  position: PositionCode;
  overallRating: number;
  preferredFoot: PreferredFoot;
  nationality: { id: string; name: string; flagUrl: string };
}

export interface LineupOverview {
  formation: Formation | null;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
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
        player: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            preferredFoot: true,
            latestOverallRating: true,
            nationality: { select: { id: true, name: true, flagUrl: true } },
            positions: { select: { position: true, isPrimary: true } },
          },
        },
      },
    });

    return assignments.map(({ player }) => {
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      return {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        position: primary?.position ?? 'ATA',
        overallRating: player.latestOverallRating,
        preferredFoot: player.preferredFoot,
        nationality: player.nationality,
      };
    });
  }

  // Separa o elenco da temporada em titulares e banco, pra que o front não
  // precise buscar dois endpoints e calcular esse diff. "Titular" é um
  // atributo do jogador (TeamLineupSlot, ver SoFIFA), não do vínculo com
  // este time: TeamLineupSlot.playerId não é filtrado pelo teamId do time
  // real, então um jogador trocado pra esse time nessa temporada continua
  // titular se já era titular do time dele de origem. Por isso os titulares
  // podem somar menos de 11 se um titular foi trocado pra fora e quem
  // entrou no lugar dele não era titular em nenhum time.
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
          player: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              preferredFoot: true,
              latestOverallRating: true,
              nationality: { select: { id: true, name: true, flagUrl: true } },
              positions: { select: { position: true, isPrimary: true } },
              lineupSlots: { select: { position: true }, take: 1 },
            },
          },
        },
      }),
    ]);

    const starters: RosterPlayer[] = [];
    const bench: RosterPlayer[] = [];

    for (const { player } of assignments) {
      const lineupSlot = player.lineupSlots[0];
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      const rosterPlayer: RosterPlayer = {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        position: lineupSlot?.position ?? primary?.position ?? 'ATA',
        overallRating: player.latestOverallRating,
        preferredFoot: player.preferredFoot,
        nationality: player.nationality,
      };

      (lineupSlot ? starters : bench).push(rosterPlayer);
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
