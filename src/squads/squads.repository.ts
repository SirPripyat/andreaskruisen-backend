import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Squad } from '../../generated/prisma/client';
import { LineupOverview, RosterPlayer, SquadWithRelations } from './types';
import { limitBench, sortByPosition } from './utils';

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
