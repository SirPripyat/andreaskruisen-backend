import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  Formation,
  PositionCode,
  PrismaClient,
  Squad,
} from '../../generated/prisma/client';
import {
  LineupOverview,
  LineupSlotAssignment,
  RosterPlayer,
  SquadWithRelations,
} from './types';
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

  async findAssignment(
    seasonId: string,
    playerId: string,
  ): Promise<LineupSlotAssignment | null> {
    return this.txHost.tx.playerTeamAssignment.findUnique({
      where: { seasonId_playerId: { seasonId, playerId } },
      select: { teamId: true, isStarter: true, lineupPosition: true },
    });
  }

  // Troca o slot (titular/banco + posição da formação) de dois jogadores do
  // elenco entre si — cobre titular↔banco e titular↔titular com a mesma
  // regra (ver regra 2 da feature de escalação: a posição pertence ao slot,
  // não ao jogador, então cada um assume o slot completo do outro).
  // Diferente do recálculo automático por overall (TransfersRepository),
  // aqui o técnico escolhe exatamente quem troca com quem — por isso o time
  // passa a ficar "travado" pra esse recálculo a partir de agora (ver
  // hasManualLineup no model Squad).
  async swapLineupSlots(
    seasonId: string,
    teamId: string,
    firstPlayerId: string,
    secondPlayerId: string,
    first: Pick<LineupSlotAssignment, 'isStarter' | 'lineupPosition'>,
    second: Pick<LineupSlotAssignment, 'isStarter' | 'lineupPosition'>,
  ): Promise<void> {
    await this.txHost.tx.playerTeamAssignment.update({
      where: { seasonId_playerId: { seasonId, playerId: firstPlayerId } },
      data: {
        isStarter: second.isStarter,
        lineupPosition: second.lineupPosition,
      },
    });
    await this.txHost.tx.playerTeamAssignment.update({
      where: { seasonId_playerId: { seasonId, playerId: secondPlayerId } },
      data: {
        isStarter: first.isStarter,
        lineupPosition: first.lineupPosition,
      },
    });
    await this.txHost.tx.squad.update({
      where: { seasonId_teamId: { seasonId, teamId } },
      data: { hasManualLineup: true },
    });
  }

  // Titulares atuais com a posição do slot que ocupam, pra remontar o
  // layout quando o técnico troca a formação (ver ChangeSquadFormationUseCase
  // e remapLineupPositions).
  async findStarterSlots(
    seasonId: string,
    teamId: string,
  ): Promise<{ playerId: string; position: PositionCode }[]> {
    const assignments = await this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, teamId, isStarter: true },
      select: {
        playerId: true,
        lineupPosition: true,
        player: {
          select: {
            positions: { select: { position: true, isPrimary: true } },
          },
        },
      },
    });

    return assignments.map(({ playerId, lineupPosition, player }) => {
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      return {
        playerId,
        position: lineupPosition ?? primary?.position ?? 'ATA',
      };
    });
  }

  // Aplica a nova formação do Squad e a posição recalculada de cada
  // titular (ver remapLineupPositions) numa só operação.
  async changeFormation(
    seasonId: string,
    teamId: string,
    formation: Formation,
    slots: { playerId: string; position: PositionCode }[],
  ): Promise<void> {
    await this.txHost.tx.squad.update({
      where: { seasonId_teamId: { seasonId, teamId } },
      data: { formation, hasManualLineup: true },
    });

    await Promise.all(
      slots.map(({ playerId, position }) =>
        this.txHost.tx.playerTeamAssignment.update({
          where: { seasonId_playerId: { seasonId, playerId } },
          data: { lineupPosition: position },
        }),
      ),
    );
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
  // (SoFIFA) quando a temporada é criada, mas numa troca ou reposicionamento
  // (ver SwapLineupStarterUseCase) ou troca de formação (ver
  // ChangeSquadFormationUseCase) é o PlayerTeamAssignment.lineupPosition que
  // acompanha quem entra/sai — por isso o elenco sempre soma exatamente 11
  // titulares, mesmo depois de trocas.
  async findLineupOverview(
    seasonId: string,
    teamId: string,
  ): Promise<LineupOverview> {
    const [team, squad, assignments] = await Promise.all([
      this.txHost.tx.team.findUnique({
        where: { id: teamId },
        select: { formation: true },
      }),
      this.txHost.tx.squad.findUnique({
        where: { seasonId_teamId: { seasonId, teamId } },
        select: { formation: true },
      }),
      this.txHost.tx.playerTeamAssignment.findMany({
        where: { seasonId, teamId },
        select: {
          isStarter: true,
          lineupPosition: true,
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
      }),
    ]);

    const starters: RosterPlayer[] = [];
    const bench: RosterPlayer[] = [];

    for (const { player, isStarter, lineupPosition } of assignments) {
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      const rosterPlayer: RosterPlayer = {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        birthdate: player.birthdate,
        position:
          (isStarter ? lineupPosition : null) ?? primary?.position ?? 'ATA',
        overallRating: player.latestOverallRating,
        preferredFoot: player.preferredFoot,
        nationality: player.nationality,
        isStarter,
      };

      (isStarter ? starters : bench).push(rosterPlayer);
    }

    return {
      formation: squad?.formation ?? team?.formation ?? null,
      starters: sortByPosition(starters),
      bench: sortByPosition(limitBench(bench)),
    };
  }
}
