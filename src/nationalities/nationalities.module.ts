import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NationalitiesController } from './nationalities.controller';
import { NationalitiesFacade } from './nationalities.facade';
import { NationalitiesRepository } from './nationalities.repository';
import {
  FindNationalityOrThrowUseCase,
  GetNationalityUseCase,
  ListNationalitiesUseCase,
  UpdateNationalityUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule],
  controllers: [NationalitiesController],
  providers: [
    NationalitiesRepository,
    NationalitiesFacade,
    FindNationalityOrThrowUseCase,
    ListNationalitiesUseCase,
    GetNationalityUseCase,
    UpdateNationalityUseCase,
  ],
  exports: [NationalitiesRepository],
})
export class NationalitiesModule {}
