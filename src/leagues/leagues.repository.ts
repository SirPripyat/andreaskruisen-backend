import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { League, PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class LeaguesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findAll(): Promise<League[]> {
    return this.txHost.tx.league.findMany({ orderBy: { name: 'asc' } });
  }

  upsertByName(name: string): Promise<League> {
    return this.txHost.tx.league.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}
