import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { StorageModule } from 'src/storage/storage.module';
import { MeController } from './me.controller';
import { MeFacade } from './me.facade';
import { MeRepository } from './me.repository';
import {
  ConfirmAvatarUploadUseCase,
  GetAvatarUploadUrlUseCase,
  GetAvatarUrlUseCase,
  GetMyActiveSeasonUseCase,
  SelectSeasonUseCase,
  UpdateMeUseCase,
} from './use-cases';

@Module({
  controllers: [MeController],
  exports: [MeRepository],
  imports: [forwardRef(() => AuthModule), StorageModule],
  providers: [
    MeRepository,
    MeFacade,
    UpdateMeUseCase,
    SelectSeasonUseCase,
    GetMyActiveSeasonUseCase,
    GetAvatarUploadUrlUseCase,
    GetAvatarUrlUseCase,
    ConfirmAvatarUploadUseCase,
  ],
})
export class MeModule {}
