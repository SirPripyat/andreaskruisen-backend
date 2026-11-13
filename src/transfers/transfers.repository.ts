import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PositionCode, PrismaClient } from '../../generated/prisma/client';
import { TransferResponseDTO } from './dto/response';
import { TransferAssignment } from './types';

const TRANSFER_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  outgoingPlayer: { select: { id: true, name: true, photoUrl: true } },
  outgoingTeam: { select: { id: true, name: true, crestUrl: true } },
  incomingPlayer: { select: { id: true, name: true, photoUrl: true } },
  incomingTeam: { select: { id: true, name: true, crestUrl: true } },
} as const;

@Injectable()
export class TransfersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findAssignment(
    seasonId: string,
    playerId: string,
  ): Promise<TransferAssignment | null> {
    const assignment = await this.txHost.tx.playerTeamAssignment.findUnique({
      where: { seasonId_playerId: { seasonId, playerId } },
      select: {
        player: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            positions: { select: { position: true, isPrimary: true } },
          },
        },
        team: { select: { id: true, name: true, crestUrl: true } },
      },
    });

    if (!assignment) return null;

    const primary =
      assignment.player.positions.find((position) => position.isPrimary) ??
      assignment.player.positions[0];

    return {
      player: {
        id: assignment.player.id,
        name: assignment.player.name,
        photoUrl: assignment.player.photoUrl,
      },
      team: assignment.team,
      position: primary?.position ?? 'ATA',
    };
  }

  async swap(
    seasonId: string,
    outgoing: TransferAssignment,
    incoming: TransferAssignment,
    requestedByUserId: string,
  ): Promise<TransferResponseDTO> {
    await this.txHost.tx.playerTeamAssignment.update({
      where: {
        seasonId_playerId: { seasonId, playerId: outgoing.player.id },
      },
      data: { teamId: incoming.team.id },
    });

    await this.txHost.tx.playerTeamAssignment.update({
      where: {
        seasonId_playerId: { seasonId, playerId: incoming.player.id },
      },
      data: { teamId: outgoing.team.id },
    });

    const affectedPositions = [
      ...new Set([outgoing.position, incoming.position]),
    ];

    for (const teamId of [outgoing.team.id, incoming.team.id]) {
      const squad = await this.txHost.tx.squad.findUnique({
        where: { seasonId_teamId: { seasonId, teamId } },
        select: { hasManualLineup: true },
      });

      if (squad?.hasManualLineup) {
        const arrivedPlayerId =
          teamId === outgoing.team.id ? incoming.player.id : outgoing.player.id;
        await this.txHost.tx.playerTeamAssignment.update({
          where: {
            seasonId_playerId: { seasonId, playerId: arrivedPlayerId },
          },
          data: { isStarter: false, lineupPosition: null },
        });
        continue;
      }

      for (const position of affectedPositions) {
        await this.recomputeStartersForPosition(seasonId, teamId, position);
      }

      await this.topUpStarters(seasonId, teamId);
    }

    return this.txHost.tx.transfer.create({
      data: {
        seasonId,
        requestedByUserId,
        outgoingPlayerId: outgoing.player.id,
        outgoingTeamId: outgoing.team.id,
        incomingPlayerId: incoming.player.id,
        incomingTeamId: incoming.team.id,
      },
      include: TRANSFER_INCLUDE,
    });
  }

  private async recomputeStartersForPosition(
    seasonId: string,
    teamId: string,
    position: PositionCode,
  ): Promise<void> {
    const [requiredSlots, candidates] = await Promise.all([
      this.txHost.tx.teamLineupSlot.count({ where: { teamId, position } }),
      this.txHost.tx.playerTeamAssignment.findMany({
        where: {
          seasonId,
          teamId,
          player: { positions: { some: { isPrimary: true, position } } },
        },
        select: { playerId: true },
        orderBy: { player: { latestOverallRating: 'desc' } },
      }),
    ]);

    const starterIds = candidates
      .slice(0, requiredSlots)
      .map((candidate) => candidate.playerId);
    const benchIds = candidates
      .slice(requiredSlots)
      .map((candidate) => candidate.playerId);

    if (starterIds.length > 0) {
      await this.txHost.tx.playerTeamAssignment.updateMany({
        where: { seasonId, teamId, playerId: { in: starterIds } },
        data: { isStarter: true, lineupPosition: position },
      });
    }
    if (benchIds.length > 0) {
      await this.txHost.tx.playerTeamAssignment.updateMany({
        where: { seasonId, teamId, playerId: { in: benchIds } },
        data: { isStarter: false, lineupPosition: null },
      });
    }
  }

  private async topUpStarters(seasonId: string, teamId: string): Promise<void> {
    const [requiredTotal, currentStarters, bench] = await Promise.all([
      this.txHost.tx.teamLineupSlot.count({ where: { teamId } }),
      this.txHost.tx.playerTeamAssignment.count({
        where: { seasonId, teamId, isStarter: true },
      }),
      this.txHost.tx.playerTeamAssignment.findMany({
        where: { seasonId, teamId, isStarter: false },
        select: {
          playerId: true,
          player: {
            select: {
              positions: { select: { position: true, isPrimary: true } },
            },
          },
        },
        orderBy: { player: { latestOverallRating: 'desc' } },
      }),
    ]);

    const shortfall = requiredTotal - currentStarters;
    if (shortfall <= 0) {
      return;
    }

    const promoted = bench.slice(0, shortfall);

    await Promise.all(
      promoted.map(({ playerId, player }) => {
        const primary =
          player.positions.find((candidate) => candidate.isPrimary) ??
          player.positions[0];

        return this.txHost.tx.playerTeamAssignment.update({
          where: { seasonId_playerId: { seasonId, playerId } },
          data: { isStarter: true, lineupPosition: primary?.position ?? 'ATA' },
        });
      }),
    );
  }

  findBySeason(seasonId: string): Promise<TransferResponseDTO[]> {
    return this.txHost.tx.transfer.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
      include: TRANSFER_INCLUDE,
    });
  }
}
