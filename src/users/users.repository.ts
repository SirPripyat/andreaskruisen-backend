import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, User, UserRole } from '../../generated/prisma/client';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: {
    name: string;
    pinHash: string;
    role?: UserRole;
  }): Promise<User> {
    return this.txHost.tx.user.create({ data });
  }

  updateRole(id: string, role: UserRole): Promise<User> {
    return this.txHost.tx.user.update({ where: { id }, data: { role } });
  }

  findByName(name: string): Promise<User | null> {
    return this.txHost.tx.user.findUnique({ where: { name } });
  }

  findMany(): Promise<Array<Pick<User, 'id' | 'name' | 'role'>>> {
    return this.txHost.tx.user.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async userExist(name: string): Promise<boolean> {
    return (await this.findByName(name)) !== null;
  }
}
