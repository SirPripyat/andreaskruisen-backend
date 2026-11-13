import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Nationality, PrismaClient } from '../../generated/prisma/client';
import { normalizeSearchTerm } from '../commons/normalize-search-term';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
} from '../commons/pagination';
import { NationalitiesSort, UpdateNationalityData } from './types';

@Injectable()
export class NationalitiesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findPaginated(
    filter: { name?: string },
    sort: NationalitiesSort,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<Nationality>> {
    const where = filter.name
      ? { nameSearch: { contains: normalizeSearchTerm(filter.name) } }
      : {};

    return paginate(
      () => this.txHost.tx.nationality.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.nationality.findMany({
          where,
          skip,
          take,
          orderBy: { [sort.sortBy]: sort.sortOrder },
        }),
      pagination,
    );
  }

  findById(id: string): Promise<Nationality | null> {
    return this.txHost.tx.nationality.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateNationalityData): Promise<Nationality> {
    return this.txHost.tx.nationality.update({ where: { id }, data });
  }

  // update: {} de propósito — flagUrl só é setado na criação da
  // nacionalidade, nunca sobrescrito em imports seguintes (mesmo motivo do
  // crestUrl em TeamsRepository.upsertByNameAndLeague).
  upsertByName(name: string, flagUrl: string): Promise<Nationality> {
    return this.txHost.tx.nationality.upsert({
      where: { name },
      create: { name, flagUrl },
      update: {},
    });
  }
}
