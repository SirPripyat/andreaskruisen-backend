import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PositionCode, PrismaClient } from '../../generated/prisma/client';
import { TransferResponseDTO } from './dto/response';
import { TransferAssignment } from './types';
import { canGrantCoupon } from './utils/transfer-coupon.utils';

const TRANSFER_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  outgoingPlayer: { select: { id: true, name: true, photoUrl: true } },
  outgoingTeam: { select: { id: true, name: true, crestUrl: true } },
  incomingPlayer: { select: { id: true, name: true, photoUrl: true } },
  incomingTeam: { select: { id: true, name: true, crestUrl: true } },
  coinTransaction: { select: { amount: true } },
} as const;

// CoinTransaction.amount é negativo (saiu do saldo); cost é o valor
// positivo que o front mostra. Usado só pra transferências já existentes
// (findBySeason) — na criação (swap) o cost já é conhecido de antemão.
const toCost = (coinTransaction: { amount: number } | null): number =>
  -(coinTransaction?.amount ?? 0);

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
            latestOverallRating: true,
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
        overall: assignment.player.latestOverallRating,
      },
      team: assignment.team,
      position: primary?.position ?? 'ATA',
    };
  }

  // Soma do ledger do squad (ver docs/regras-temporada/saldo-inicial.md) —
  // saldo nunca é um campo, é sempre recalculado a partir das transações.
  async findSquadBalance(squadId: string): Promise<number> {
    const result = await this.txHost.tx.coinTransaction.aggregate({
      where: { squadId },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  // Soma do ledger de cupons do squad (ver transfer-coupon.utils) — mesmo
  // princípio do saldo de moedas: nunca um campo, sempre recalculado.
  async findSquadCouponBalance(squadId: string): Promise<number> {
    const result = await this.txHost.tx.couponTransaction.aggregate({
      where: { squadId },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  // Concede 1 cupom ao squad, respeitando o teto de acúmulo (seção 3 do
  // regulamento) — se o squad já estiver no teto, o cupom é perdido e
  // nenhuma transação é gravada.
  async grantCoupon(squadId: string): Promise<void> {
    const currentBalance = await this.findSquadCouponBalance(squadId);

    if (!canGrantCoupon(currentBalance)) return;

    await this.txHost.tx.couponTransaction.create({
      data: { squadId, type: 'GRANTED', amount: 1 },
    });
  }

  async swap(
    seasonId: string,
    outgoing: TransferAssignment,
    incoming: TransferAssignment,
    requestedByUserId: string,
    payingSquadId: string,
    cost: number,
    useCoupon: boolean,
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

    const transfer = await this.txHost.tx.transfer.create({
      data: {
        seasonId,
        requestedByUserId,
        outgoingPlayerId: outgoing.player.id,
        outgoingTeamId: outgoing.team.id,
        incomingPlayerId: incoming.player.id,
        incomingTeamId: incoming.team.id,
        outgoingPlayerOverall: outgoing.player.overall,
        incomingPlayerOverall: incoming.player.overall,
      },
      include: TRANSFER_INCLUDE,
    });

    await this.txHost.tx.coinTransaction.create({
      data: {
        squadId: payingSquadId,
        type: 'TRANSFER',
        amount: -cost,
        transferId: transfer.id,
      },
    });

    if (useCoupon) {
      await this.txHost.tx.couponTransaction.create({
        data: {
          squadId: payingSquadId,
          type: 'USED',
          amount: -1,
          transferId: transfer.id,
        },
      });
    }

    // transfer.coinTransaction ainda é null aqui (foi lido antes da
    // CoinTransaction existir) — usa o cost já calculado em vez de reler.
    const { coinTransaction: _unused, ...transferData } = transfer;
    return { ...transferData, cost };
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
    return this.txHost.tx.transfer
      .findMany({
        where: { seasonId },
        orderBy: { createdAt: 'desc' },
        include: TRANSFER_INCLUDE,
      })
      .then((transfers) =>
        transfers.map(({ coinTransaction, ...transfer }) => ({
          ...transfer,
          cost: toCost(coinTransaction),
        })),
      );
  }
}
