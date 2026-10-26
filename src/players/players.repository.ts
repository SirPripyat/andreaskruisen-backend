import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PlayersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findPaginated(params: { name?: string; skip: number; take: number }) {
    const where = params.name
      ? { name: { contains: params.name, mode: 'insensitive' as const } }
      : {};

    const [total, players] = await Promise.all([
      this.txHost.tx.player.count({ where }),
      this.txHost.tx.player.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { name: 'asc' },
        include: {
          team: true,
          nationality: true,
          positions: true,
          ratings: { orderBy: { capturedAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return { total, players };
  }
}
