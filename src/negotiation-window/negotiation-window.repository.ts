import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import { NegotiationWindowResponseDTO } from './dto/response';
import { OpenNegotiationWindow } from './types';

const NEGOTIATION_WINDOW_INCLUDE = {
  openedBy: { select: { id: true, name: true } },
  closedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class NegotiationWindowRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findOpen(seasonId: string): Promise<OpenNegotiationWindow | null> {
    return this.txHost.tx.negotiationWindow.findFirst({
      where: { seasonId, closedAt: null },
      select: { id: true, feeEnabled: true },
    });
  }

  open(
    seasonId: string,
    userId: string,
    feeEnabled: boolean,
  ): Promise<NegotiationWindowResponseDTO> {
    return this.txHost.tx.negotiationWindow.create({
      data: { seasonId, feeEnabled, openedByUserId: userId },
      include: NEGOTIATION_WINDOW_INCLUDE,
    });
  }

  close(
    windowId: string,
    userId: string,
  ): Promise<NegotiationWindowResponseDTO> {
    return this.txHost.tx.negotiationWindow.update({
      where: { id: windowId },
      data: { closedAt: new Date(), closedByUserId: userId },
      include: NEGOTIATION_WINDOW_INCLUDE,
    });
  }

  findHistory(seasonId: string): Promise<NegotiationWindowResponseDTO[]> {
    return this.txHost.tx.negotiationWindow.findMany({
      where: { seasonId },
      orderBy: { openedAt: 'desc' },
      include: NEGOTIATION_WINDOW_INCLUDE,
    });
  }
}
