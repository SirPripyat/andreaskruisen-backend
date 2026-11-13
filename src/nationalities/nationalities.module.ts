import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NationalitiesController } from './nationalities.controller';
import { NationalitiesRepository } from './nationalities.repository';
import { NationalitiesService } from './nationalities.service';

@Module({
  imports: [AuthModule],
  controllers: [NationalitiesController],
  providers: [NationalitiesService, NationalitiesRepository],
  exports: [NationalitiesRepository],
})
export class NationalitiesModule {}
