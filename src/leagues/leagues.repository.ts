import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import { normalizeSearchTerm } from '../commons/normalize-search-term';
import { PaginationQuery, paginate } from '../commons/pagination';
import { ListLeaguesResponseDTO } from './dto';
import {
  League,
  LeaguesSort,
  LeagueWithCountry,
  UpdateLeagueData,
} from './types';

@Injectable()
export class LeaguesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findPaginated(
    filter: { name?: string },
    sort: LeaguesSort,
    pagination: PaginationQuery,
  ): Promise<ListLeaguesResponseDTO> {
    const where = filter.name
      ? { nameSearch: { contains: normalizeSearchTerm(filter.name) } }
      : {};

    return paginate(
      () => this.txHost.tx.league.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.league.findMany({
          where,
          skip,
          take,
          orderBy: { [sort.sortBy]: sort.sortOrder },
          include: { country: true },
        }),
      pagination,
    );
  }

  findById(id: string): Promise<LeagueWithCountry | null> {
    return this.txHost.tx.league.findUnique({
      where: { id },
      include: { country: true },
    });
  }

  update(id: string, data: UpdateLeagueData): Promise<LeagueWithCountry> {
    return this.txHost.tx.league.update({
      where: { id },
      data,
      include: { country: true },
    });
  }

  upsertByName(name: string): Promise<League> {
    return this.txHost.tx.league.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}
