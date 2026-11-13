import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { SeasonsModule } from 'src/seasons/seasons.module';
import { StorageModule } from 'src/storage/storage.module';
import { MeController } from './me.controller';
import { MeFacade } from './me.facade';
import { MeRepository } from './me.repository';
import {
  ConfirmAvatarUploadUseCase,
  GetAvatarUploadUrlUseCase,
  GetAvatarUrlUseCase,
  GetDashboardUseCase,
  GetMeUseCase,
  GetMyActiveSeasonUseCase,
  SelectSeasonUseCase,
  UpdateMeUseCase,
} from './use-cases';

@Module({
  controllers: [MeController],
  exports: [MeRepository],
  imports: [forwardRef(() => AuthModule), SeasonsModule, StorageModule],
  providers: [
    MeRepository,
    MeFacade,
    GetMeUseCase,
    UpdateMeUseCase,
    SelectSeasonUseCase,
    GetMyActiveSeasonUseCase,
    GetAvatarUploadUrlUseCase,
    GetAvatarUrlUseCase,
    ConfirmAvatarUploadUseCase,
    GetDashboardUseCase,
  ],
})
export class MeModule {}
