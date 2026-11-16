import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Speciality } from '../../generated/prisma/client';

@Injectable()
export class SpecialitiesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  upsertByName(name: string): Promise<Speciality> {
    return this.txHost.tx.speciality.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}
