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

  async findTransfersForAudit(seasonId: string): Promise<TransferForAudit[]> {
    const transfers = await this.txHost.tx.transfer.findMany({
      where: { seasonId },
      select: {
        id: true,
        createdAt: true,
        outgoingPlayerOverall: true,
        incomingPlayerOverall: true,
        couponTransaction: { select: { id: true } },
        coinTransaction: { select: { amount: true } },
      },
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      createdAt: transfer.createdAt,
      outgoingPlayerOverall: transfer.outgoingPlayerOverall,
      incomingPlayerOverall: transfer.incomingPlayerOverall,
      useCoupon: transfer.couponTransaction !== null,
      recordedCost: transfer.coinTransaction
        ? -transfer.coinTransaction.amount
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
        coinTransactions: { select: { amount: true } },
      },
    });

    return negotiations.map((negotiation) => ({
      id: negotiation.id,
      coinAmount: negotiation.coinAmount,
      coinTransactionCount: negotiation.coinTransactions.length,
      coinTransactionSum: negotiation.coinTransactions.reduce(
        (total, transaction) => total + transaction.amount,
        0,
      ),
    }));
  }
}
