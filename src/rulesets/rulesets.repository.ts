import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, PrismaClient, Ruleset } from '../../generated/prisma/client';

@Injectable()
export class RulesetsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: {
    seasonId: string;
    version: number;
    payload: Prisma.InputJsonValue;
    validFrom?: Date;
  }): Promise<Ruleset> {
    return this.txHost.tx.ruleset.create({ data });
  }

  // Ruleset vigente numa data: a versão mais recente cujo validFrom não é
  // depois dela — é isso que a auditoria usa pra reavaliar uma operação
  // antiga pela regra da época, nunca pela atual.
  findActiveAt(seasonId: string, atTime: Date): Promise<Ruleset | null> {
    return this.txHost.tx.ruleset.findFirst({
      where: { seasonId, validFrom: { lte: atTime } },
      orderBy: { validFrom: 'desc' },
    });
  }
}
