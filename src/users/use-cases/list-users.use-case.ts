import { Injectable } from '@nestjs/common';
import { User } from '../../../generated/prisma/client';
import { UsersRepository } from '../users.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly repository: UsersRepository) {}

  execute(): Promise<Array<Pick<User, 'id' | 'name' | 'role'>>> {
    return this.repository.findMany();
  }
}
