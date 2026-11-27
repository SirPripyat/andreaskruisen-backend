import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  CoinTransactionType,
  CouponTransactionType,
  PositionCode,
  PrismaClient,
  TransferOriginType,
} from '../../generated/prisma/client';
import { TransferResponseDTO } from './dto/response';
import { TransferAssignment } from './types';
import { canGrantCoupon } from './utils/transfer-coupon.utils';

const TRANSFER_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  outgoingPlayers: {
    select: {
      overall: true,
      player: { select: { id: true, name: true, photoUrl: true } },
    },
  },
  outgoingTeam: { select: { id: true, name: true, crestUrl: true } },
  incomingPlayers: {
    select: {
      overall: true,
      player: { select: { id: true, name: true, photoUrl: true } },
    },
  },
  incomingTeam: { select: { id: true, name: true, crestUrl: true } },
  coinTransactions: { select: { amount: true } },
} as const;

// Prisma devolve cada linha de TransferOutgoingPlayer/TransferIncomingPlayer
// como { overall, player: {...} } — achata pro formato que o resto da API
// espera (ver TransferPlayerMovementSummaryResponseDTO).
const toPlayerSummaries = (
  rows: Array<{
    overall: number;
    player: { id: string; name: string; photoUrl: string };
  }>,
) => rows.map(({ player, overall }) => ({ ...player, overall }));

// CoinTransaction.amount é negativo (saiu do saldo); cost é o valor
// positivo que o front mostra. No mercado tradicional sempre existe
// exatamente 1 lançamento, então isso é só -amount; numa negociação pode
// haver mais de um (coinAmount dos dois lados + taxa), e o resultado é o
// saldo líquido de moedas movido pela operação como um todo.
const toCost = (coinTransactions: { amount: number }[]): number =>
  -coinTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

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

  // Respeita o teto de acúmulo (seção 3 do regulamento) sem gravar nada —
  // quem decide conceder ou não já sabe de antemão se vale a pena chamar
  // record() com esse lançamento.
  async canGrantCoupon(squadId: string, cap: number): Promise<boolean> {
    const currentBalance = await this.findSquadCouponBalance(squadId);
    return canGrantCoupon(currentBalance, cap);
  }

  // Primitiva central de qualquer movimentação de jogador e/ou moeda (ver
  // Transfer.originType): move PlayerTeamAssignment, recalcula titulares,
  // cria o Transfer e grava exatamente os lançamentos de ledger recebidos —
  // não decide sozinha valores nem elegibilidade, isso já vem resolvido de
  // quem chama (CreateTransferUseCase para mercado, AcceptNegotiationUseCase
  // para negociação direta).
  async record(params: {
    seasonId: string;
    originType: TransferOriginType;
    requestedByUserId: string;
    negotiationId?: string;
    // Lado que detém o outgoing antes da movimentação e recebe o incoming
    // depois (ver DirectNegotiation: é o proposingTeam; no mercado, onde a
    // troca é sempre completa, é o outgoing.team.id).
    teamAId: string;
    // Lado que detém o incoming antes da movimentação e recebe o outgoing
    // depois (ver DirectNegotiation: é o targetTeam; no mercado é o
    // incoming.team.id).
    teamBId: string;
    // Vazio numa compra/venda pura nascida de negociação direta — 1
    // elemento no caso comum, até 2 no mercado tradicional multi-jogador
    // (ver v1-transferencias.md).
    outgoing: TransferAssignment[];
    incoming: TransferAssignment[];
    feeEnabled: boolean;
    coinTransactions: Array<{
      squadId: string;
      type: CoinTransactionType;
      amount: number;
    }>;
    couponTransactions: Array<{
      squadId: string;
      type: CouponTransactionType;
      amount: number;
    }>;
  }) {
    const {
      seasonId,
      originType,
      requestedByUserId,
      negotiationId,
      teamAId,
      teamBId,
      outgoing,
      incoming,
      feeEnabled,
      coinTransactions,
      couponTransactions,
    } = params;

    for (const assignment of outgoing) {
      await this.txHost.tx.playerTeamAssignment.update({
        where: {
          seasonId_playerId: { seasonId, playerId: assignment.player.id },
        },
        data: { teamId: teamBId },
      });
    }

    for (const assignment of incoming) {
      await this.txHost.tx.playerTeamAssignment.update({
        where: {
          seasonId_playerId: { seasonId, playerId: assignment.player.id },
        },
        data: { teamId: teamAId },
      });
    }

    await this.applyLineupChanges(seasonId, teamAId, teamBId, {
      outgoing,
      incoming,
    });

    const transfer = await this.txHost.tx.transfer.create({
      data: {
        seasonId,
        originType,
        requestedByUserId,
        negotiationId,
        outgoingTeamId: teamAId,
        incomingTeamId: teamBId,
        feeEnabled,
        outgoingPlayers: {
          create: outgoing.map((assignment) => ({
            playerId: assignment.player.id,
            overall: assignment.player.overall,
          })),
        },
        incomingPlayers: {
          create: incoming.map((assignment) => ({
            playerId: assignment.player.id,
            overall: assignment.player.overall,
          })),
        },
      },
      include: TRANSFER_INCLUDE,
    });

    if (coinTransactions.length > 0) {
      await this.txHost.tx.coinTransaction.createMany({
        data: coinTransactions.map((transaction) => ({
          ...transaction,
          transferId: transfer.id,
        })),
      });
    }

    if (couponTransactions.length > 0) {
      await this.txHost.tx.couponTransaction.createMany({
        data: couponTransactions.map((transaction) => ({
          ...transaction,
          transferId: transfer.id,
        })),
      });
    }

    const { outgoingPlayers, incomingPlayers, ...transferData } = transfer;
    return {
      ...transferData,
      outgoingPlayers: toPlayerSummaries(outgoingPlayers),
      incomingPlayers: toPlayerSummaries(incomingPlayers),
    };
  }

  async swap(
    seasonId: string,
    outgoing: TransferAssignment[],
    incoming: TransferAssignment[],
    requestedByUserId: string,
    payingSquadId: string,
    cost: number,
    useCoupon: boolean,
    feeEnabled: boolean,
  ): Promise<TransferResponseDTO> {
    const transfer = await this.record({
      seasonId,
      originType: 'MARKET',
      requestedByUserId,
      teamAId: outgoing[0].team.id,
      teamBId: incoming[0].team.id,
      outgoing,
      incoming,
      feeEnabled,
      coinTransactions: [
        { squadId: payingSquadId, type: 'TRANSFER', amount: -cost },
      ],
      couponTransactions: useCoupon
        ? [{ squadId: payingSquadId, type: 'USED', amount: -1 }]
        : [],
    });

    // transfer.coinTransactions ainda não reflete os lançamentos recém-
    // criados (foi lido antes deles existirem) — usa o cost já calculado em
    // vez de reler.
    const { coinTransactions: _unused, ...transferData } = transfer;
    return { ...transferData, cost };
  }

  // Generalização do recálculo de titulares: outgoing/incoming podem vir
  // vazios (compra/venda pura nascida de negociação direta) ou ter mais de
  // 1 jogador (mercado tradicional multi-jogador).
  private async applyLineupChanges(
    seasonId: string,
    teamAId: string,
    teamBId: string,
    movement: {
      outgoing: TransferAssignment[];
      incoming: TransferAssignment[];
    },
  ): Promise<void> {
    const affectedPositions = [
      ...new Set(
        [...movement.outgoing, ...movement.incoming].map(
          (assignment) => assignment.position,
        ),
      ),
    ];

    const arrivedPlayerIdsByTeam: Record<string, string[]> = {
      [teamAId]: movement.incoming.map((assignment) => assignment.player.id),
      [teamBId]: movement.outgoing.map((assignment) => assignment.player.id),
    };

    for (const teamId of [teamAId, teamBId]) {
      const squad = await this.txHost.tx.squad.findUnique({
        where: { seasonId_teamId: { seasonId, teamId } },
        select: { hasManualLineup: true },
      });

      const arrivedPlayerIds = arrivedPlayerIdsByTeam[teamId];

      if (squad?.hasManualLineup) {
        if (arrivedPlayerIds.length > 0) {
          await this.txHost.tx.playerTeamAssignment.updateMany({
            where: { seasonId, playerId: { in: arrivedPlayerIds } },
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

  // Lista todas as movimentações da season — mercado tradicional e
  // negociação direta aceita (ver Transfer.originType), já que as duas
  // viram o mesmo registro de fato a partir da unificação do ledger.
  findBySeason(seasonId: string): Promise<TransferResponseDTO[]> {
    return this.txHost.tx.transfer
      .findMany({
        where: { seasonId },
        orderBy: { createdAt: 'desc' },
        include: TRANSFER_INCLUDE,
      })
      .then((transfers) =>
        transfers.map(
          ({
            coinTransactions,
            outgoingPlayers,
            incomingPlayers,
            ...transfer
          }) => ({
            ...transfer,
            outgoingPlayers: toPlayerSummaries(outgoingPlayers),
            incomingPlayers: toPlayerSummaries(incomingPlayers),
            cost: toCost(coinTransactions),
          }),
        ),
      );
  }
}
