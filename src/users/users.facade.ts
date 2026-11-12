import { Injectable } from '@nestjs/common';
import { CreateUser } from './dto/request';
import { UserSummaryResponse } from './dto/response';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  RemoveUserUseCase,
} from './use-cases';

@Injectable()
export class UsersFacade {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly removeUserUseCase: RemoveUserUseCase,
  ) {}

  findAll(): Promise<UserSummaryResponse[]> {
    return this.listUsersUseCase.execute();
  }

  async create(dto: CreateUser): Promise<void> {
    await this.createUserUseCase.execute(dto);
  }

  async remove(id: string, requestingUserId: string): Promise<void> {
    await this.removeUserUseCase.execute(id, requestingUserId);
  }
}
