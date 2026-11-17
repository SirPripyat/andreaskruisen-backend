import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  PositionCode,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client';
import { canGrantCoupon } from '../transfers/utils/transfer-coupon.utils';
import { NegotiationResponseDTO } from './dto/response';
import {
  NegotiationAssignment,
  NegotiationClauseInput,
  NegotiationWithTeams,
} from './types';
import {
  resolveNegotiationCoinTransactions,
  resolveNegotiationCouponRecipients,
} from './utils';

const NEGOTIATION_INCLUDE = {
  proposingSquad: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, crestUrl: true } },
    },
  },
  targetSquad: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, crestUrl: true } },
    },
  },
  outgoingPlayer: { select: { id: true, name: true, photoUrl: true } },
  incomingPlayer: { select: { id: true, name: true, photoUrl: true } },
  clauses: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      type: true,
      amount: true,
      matchesCount: true,
      terms: true,
      player: { select: { id: true, name: true, photoUrl: true } },
    },
  },
} as const;

type NegotiationWithRelations = Prisma.DirectNegotiationGetPayload<{
  include: typeof NEGOTIATION_INCLUDE;
}>;

const toResponseDTO = (
  raw: NegotiationWithRelations,
): NegotiationResponseDTO => {
  const {
    proposingSquad,
    targetSquad,
    outgoingPlayer,
    incomingPlayer,
    ...rest
  } = raw;

  return {
    ...rest,
    proposingSquad: {
      squadId: proposingSquad.id,
      user: proposingSquad.user,
      team: proposingSquad.team,
    },
    targetSquad: {
      squadId: targetSquad.id,
      user: targetSquad.user,
      team: targetSquad.team,
    },
    outgoingPlayer,
    incomingPlayer,
  } as NegotiationResponseDTO;
};

@Injectable()
export class NegotiationsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findAssignment(
    seasonId: string,
    playerId: string,
  ): Promise<NegotiationAssignment | null> {
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

  // Mesmo princípio do ledger de moedas em TransfersRepository: o saldo
  // nunca é um campo, é sempre recalculado a partir das transações.
  async findSquadBalance(squadId: string): Promise<number> {
    const result = await this.txHost.tx.coinTransaction.aggregate({
      where: { squadId },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  create(data: {
    seasonId: string;
    proposingSquadId: string;
    targetSquadId: string;
    outgoingPlayerId: string | null;
    incomingPlayerId: string | null;
    coinAmount: number | null;
    clauses: NegotiationClauseInput[];
  }): Promise<NegotiationResponseDTO> {
    const { clauses, ...negotiationData } = data;

    return this.txHost.tx.directNegotiation
      .create({
        data: { ...negotiationData, clauses: { create: clauses } },
        include: NEGOTIATION_INCLUDE,
      })
      .then(toResponseDTO);
  }

  async findByIdWithTeams(id: string): Promise<NegotiationWithTeams | null> {
    const negotiation = await this.txHost.tx.directNegotiation.findUnique({
      where: { id },
      include: {
        proposingSquad: { select: { teamId: true } },
        targetSquad: { select: { teamId: true } },
      },
    });

    if (!negotiation) return null;

    return {
      id: negotiation.id,
      seasonId: negotiation.seasonId,
      status: negotiation.status,
      proposingSquadId: negotiation.proposingSquadId,
      proposingTeamId: negotiation.proposingSquad.teamId,
      targetSquadId: negotiation.targetSquadId,
      targetTeamId: negotiation.targetSquad.teamId,
      outgoingPlayerId: negotiation.outgoingPlayerId,
      incomingPlayerId: negotiation.incomingPlayerId,
      coinAmount: negotiation.coinAmount,
    };
  }

  findForSquad(squadId: string): Promise<NegotiationResponseDTO[]> {
    return this.txHost.tx.directNegotiation
      .findMany({
        where: {
          OR: [{ proposingSquadId: squadId }, { targetSquadId: squadId }],
        },
        orderBy: { createdAt: 'desc' },
        include: NEGOTIATION_INCLUDE,
      })
      .then((negotiations) => negotiations.map(toResponseDTO));
  }

  reject(id: string): Promise<NegotiationResponseDTO> {
    return this.txHost.tx.directNegotiation
      .update({
        where: { id },
        data: { status: 'REJECTED', resolvedAt: new Date() },
        include: NEGOTIATION_INCLUDE,
      })
      .then(toResponseDTO);
  }

  async accept(params: {
    seasonId: string;
    negotiationId: string;
    proposingSquadId: string;
    proposingTeamId: string;
    targetSquadId: string;
    targetTeamId: string;
    outgoing: NegotiationAssignment | null;
    incoming: NegotiationAssignment | null;
    coinAmount: number | null;
    couponCap: number;
  }): Promise<NegotiationResponseDTO> {
    const {
      seasonId,
      negotiationId,
      proposingSquadId,
      proposingTeamId,
      targetSquadId,
      targetTeamId,
      outgoing,
      incoming,
      coinAmount,
      couponCap,
    } = params;

    if (outgoing) {
      await this.txHost.tx.playerTeamAssignment.update({
        where: {
          seasonId_playerId: { seasonId, playerId: outgoing.player.id },
        },
        data: { teamId: targetTeamId },
      });
    }

    if (incoming) {
      await this.txHost.tx.playerTeamAssignment.update({
        where: {
          seasonId_playerId: { seasonId, playerId: incoming.player.id },
        },
        data: { teamId: proposingTeamId },
      });
    }

    await this.applyLineupChanges(seasonId, proposingTeamId, targetTeamId, {
      outgoing,
      incoming,
    });

    const coinTransactions = resolveNegotiationCoinTransactions({
      proposingSquadId,
      targetSquadId,
      coinAmount,
    });

    if (coinTransactions.length > 0) {
      await this.txHost.tx.coinTransaction.createMany({
        data: coinTransactions.map(({ squadId, amount }) => ({
          squadId,
          type: 'DIRECT_NEGOTIATION',
          amount,
          directNegotiationId: negotiationId,
        })),
      });
    }

    const couponRecipients = resolveNegotiationCouponRecipients({
      proposingSquadId,
      targetSquadId,
      outgoingPlayerId: outgoing?.player.id ?? null,
      incomingPlayerId: incoming?.player.id ?? null,
    });

    for (const squadId of couponRecipients) {
      await this.grantCoupon(squadId, negotiationId, couponCap);
    }

    return this.txHost.tx.directNegotiation
      .update({
        where: { id: negotiationId },
        data: { status: 'ACCEPTED', resolvedAt: new Date() },
        include: NEGOTIATION_INCLUDE,
      })
      .then(toResponseDTO);
  }

  // Concede 1 cupom ao squad, respeitando o teto de acúmulo (seção 3 do
  // regulamento) — mesma regra de TransfersRepository.grantCoupon, mas
  // ligada à negociação em vez da transferência.
  private async grantCoupon(
    squadId: string,
    negotiationId: string,
    cap: number,
  ): Promise<void> {
    const result = await this.txHost.tx.couponTransaction.aggregate({
      where: { squadId },
      _sum: { amount: true },
    });
    const currentBalance = result._sum.amount ?? 0;

    if (!canGrantCoupon(currentBalance, cap)) return;

    await this.txHost.tx.couponTransaction.create({
      data: {
        squadId,
        type: 'GRANTED',
        amount: 1,
        directNegotiationId: negotiationId,
      },
    });
  }

  // Mesma lógica de recálculo de escalação do TransfersRepository.swap,
  // generalizada pra negociações onde só um dos dois jogadores pode se
  // mover (compra/venda) em vez de sempre os dois (troca de mercado).
  private async applyLineupChanges(
    seasonId: string,
    proposingTeamId: string,
    targetTeamId: string,
    movement: {
      outgoing: NegotiationAssignment | null;
      incoming: NegotiationAssignment | null;
    },
  ): Promise<void> {
    const affectedPositions = [
      ...new Set(
        [movement.outgoing?.position, movement.incoming?.position].filter(
          (position): position is PositionCode => position != null,
        ),
      ),
    ];

    const arrivedPlayerByTeam: Record<string, string | null> = {
      [proposingTeamId]: movement.incoming?.player.id ?? null,
      [targetTeamId]: movement.outgoing?.player.id ?? null,
    };

    for (const teamId of [proposingTeamId, targetTeamId]) {
      const squad = await this.txHost.tx.squad.findUnique({
        where: { seasonId_teamId: { seasonId, teamId } },
        select: { hasManualLineup: true },
      });

      const arrivedPlayerId = arrivedPlayerByTeam[teamId];

      if (squad?.hasManualLineup) {
        if (arrivedPlayerId) {
          await this.txHost.tx.playerTeamAssignment.update({
            where: {
              seasonId_playerId: { seasonId, playerId: arrivedPlayerId },
            },
            data: { isStarter: false, lineupPosition: null },
          });
        }
        continue;
      }

      for (const position of affectedPositions) {
        await this.recomputeStartersForPosition(seasonId, teamId, position);
      }

      await this.topUpStarters(seasonId, teamId);
    }
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
}
