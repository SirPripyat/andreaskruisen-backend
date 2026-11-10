import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Nationality, PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class NationalitiesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  upsertByName(name: string, flagUrl: string): Promise<Nationality> {
    return this.txHost.tx.nationality.upsert({
      where: { name },
      create: { name, flagUrl },
      update: { flagUrl },
    });
  }
}
