import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import {
  ConfirmAvatarUploadUseCase,
  CreateUserUseCase,
  EnsureDefaultAdminUseCase,
  GetAvatarUploadUrlUseCase,
  GetAvatarUrlUseCase,
  ListUsersUseCase,
  RemoveUserUseCase,
  SelectSeasonUseCase,
  UpdateProfileUseCase,
} from './use-cases';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

@Module({
  imports: [forwardRef(() => AuthModule), StorageModule],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    ListUsersUseCase,
    CreateUserUseCase,
    RemoveUserUseCase,
    SelectSeasonUseCase,
    EnsureDefaultAdminUseCase,
    GetAvatarUploadUrlUseCase,
    ConfirmAvatarUploadUseCase,
    GetAvatarUrlUseCase,
    UpdateProfileUseCase,
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
