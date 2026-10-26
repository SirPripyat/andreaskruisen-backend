import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import { PaginationQuery, paginate } from '../commons/pagination';

@Injectable()
export class PlayersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findPaginated(filter: { name?: string }, pagination: PaginationQuery) {
    const where = filter.name
      ? { name: { contains: filter.name, mode: 'insensitive' as const } }
      : {};

    return paginate(
      () => this.txHost.tx.player.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.player.findMany({
          where,
          skip,
          take,
          orderBy: { name: 'asc' },
          include: {
            team: true,
            nationality: true,
            positions: true,
            ratings: { orderBy: { capturedAt: 'desc' }, take: 1 },
          },
        }),
      pagination,
    );
  }
}
