import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Session } from '../../generated/prisma/client';

@Injectable()
export class SessionsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.txHost.tx.session.create({ data });
  }

  findValidByToken(
    token: string,
  ): Promise<(Session & { user: { id: string; name: string } }) | null> {
    return this.txHost.tx.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  deleteByToken(token: string): Promise<void> {
    return this.txHost.tx.session
      .deleteMany({ where: { token } })
      .then(() => undefined);
  }
}
