import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  CreateUserUseCase,
  EnsureDefaultAdminUseCase,
  ListUsersUseCase,
  RemoveUserUseCase,
} from './use-cases';
import { UsersController } from './users.controller';
import { UsersFacade } from './users.facade';
import { UsersRepository } from './users.repository';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    UsersFacade,
    ListUsersUseCase,
    CreateUserUseCase,
    RemoveUserUseCase,
    EnsureDefaultAdminUseCase,
  ],
  exports: [UsersRepository],
})
export class UsersModule implements OnModuleInit {
  constructor(
    private readonly ensureDefaultAdminUseCase: EnsureDefaultAdminUseCase,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultAdminUseCase.execute();
  }
}
