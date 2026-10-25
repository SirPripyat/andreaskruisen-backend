import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, User } from '../../generated/prisma/client';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: { name: string; pinHash: string }): Promise<User> {
    return this.txHost.tx.user.create({ data });
  }

  findByName(name: string): Promise<User | null> {
    return this.txHost.tx.user.findUnique({ where: { name } });
  }

  async userExist(name: string): Promise<boolean> {
    return (await this.findByName(name)) !== null;
  }
}
