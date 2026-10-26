import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import { PaginationQuery, paginate, SortOrder } from '../commons/pagination';

// Mapeia o campo de ordenação exposto na API pro campo real no Prisma.
// overallRating não existe em Player; a listagem ordena pela cópia
// mantida em latestOverallRating (ver player-import.ts).
const PLAYER_ORDER_BY_FIELD = {
  name: 'name',
  overallRating: 'latestOverallRating',
} as const;

export interface PlayersSort {
  sortBy: keyof typeof PLAYER_ORDER_BY_FIELD;
  sortOrder: SortOrder;
}

@Injectable()
export class PlayersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findPaginated(
    filter: { name?: string },
    sort: PlayersSort,
    pagination: PaginationQuery,
  ) {
    const where = filter.name
      ? { name: { contains: filter.name, mode: 'insensitive' as const } }
      : {};
    const orderBy = {
      [PLAYER_ORDER_BY_FIELD[sort.sortBy]]: sort.sortOrder,
    };

    return paginate(
      () => this.txHost.tx.player.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.player.findMany({
          where,
          skip,
          take,
          orderBy,
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
