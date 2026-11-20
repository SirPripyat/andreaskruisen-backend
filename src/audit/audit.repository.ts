import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import {
  DirectNegotiationForAudit,
  SquadBalance,
  TransferForAudit,
} from './types';

@Injectable()
export class AuditRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findSquadBalances(seasonId: string): Promise<SquadBalance[]> {
    const squads = await this.txHost.tx.squad.findMany({
      where: { seasonId },
      select: { id: true },
    });

    const balances = await this.txHost.tx.coinTransaction.groupBy({
      by: ['squadId'],
      where: { squadId: { in: squads.map((squad) => squad.id) } },
      _sum: { amount: true },
    });

    const balanceBySquadId = new Map(
      balances.map((row) => [row.squadId, row._sum.amount ?? 0]),
    );

    return squads.map((squad) => ({
      squadId: squad.id,
      balance: balanceBySquadId.get(squad.id) ?? 0,
    }));
  }

  // Só mercado tradicional (ver Transfer.originType): é o único cujo custo
  // é recalculável pela fórmula fixa de pricing — negociação direta tem
  // preço livre, auditada separadamente (ver findAcceptedNegotiationsForAudit).
  async findTransfersForAudit(seasonId: string): Promise<TransferForAudit[]> {
    const transfers = await this.txHost.tx.transfer.findMany({
      where: { seasonId, originType: 'MARKET' },
      select: {
        id: true,
        createdAt: true,
        outgoingPlayerOverall: true,
        incomingPlayerOverall: true,
        feeEnabled: true,
        couponTransactions: { select: { id: true } },
        coinTransactions: { select: { amount: true } },
      },
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      createdAt: transfer.createdAt,
      // Mercado tradicional é sempre uma troca completa (ver
      // CreateTransferUseCase) — os dois overalls nunca são nulos aqui.
      outgoingPlayerOverall: transfer.outgoingPlayerOverall as number,
      incomingPlayerOverall: transfer.incomingPlayerOverall as number,
      feeEnabled: transfer.feeEnabled,
      useCoupon: transfer.couponTransactions.length > 0,
      recordedCost:
        transfer.coinTransactions.length > 0
          ? -transfer.coinTransactions.reduce(
              (total, transaction) => total + transaction.amount,
              0,
            )
          : null,
    }));
  }

  async findAcceptedNegotiationsForAudit(
    seasonId: string,
  ): Promise<DirectNegotiationForAudit[]> {
    const negotiations = await this.txHost.tx.directNegotiation.findMany({
      where: { seasonId, status: 'ACCEPTED' },
      select: {
        id: true,
        coinAmount: true,
        resolvedAt: true,
        // Snapshot de overall/feeEnabled mora no Transfer gerado pelo
        // aceite, não mais na própria DirectNegotiation (ver
        // Transfer.negotiationId).
        transfer: {
          select: {
            outgoingPlayerOverall: true,
            incomingPlayerOverall: true,
            feeEnabled: true,
            coinTransactions: { select: { type: true, amount: true } },
          },
        },
      },
    });

    return negotiations.map((negotiation) => {
      const allCoinTransactions = negotiation.transfer?.coinTransactions ?? [];
      const coinTransactions = allCoinTransactions.filter(
        (transaction) => transaction.type === 'TRANSFER',
      );
      const feeTransactions = allCoinTransactions.filter(
        (transaction) => transaction.type === 'TRANSFER_FEE',
      );

      return {
        id: negotiation.id,
        coinAmount: negotiation.coinAmount,
        coinTransactionCount: coinTransactions.length,
        coinTransactionSum: coinTransactions.reduce(
          (total, transaction) => total + transaction.amount,
          0,
        ),
        resolvedAt: negotiation.resolvedAt,
        outgoingPlayerOverall:
          negotiation.transfer?.outgoingPlayerOverall ?? null,
        incomingPlayerOverall:
          negotiation.transfer?.incomingPlayerOverall ?? null,
        feeEnabled: negotiation.transfer?.feeEnabled ?? null,
        recordedFee: -feeTransactions.reduce(
          (total, transaction) => total + transaction.amount,
          0,
        ),
      };
    });
  }
}
