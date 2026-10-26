import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsController } from './seasons.controller';
import { SeasonsRepository } from './seasons.repository';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [AuthModule],
  controllers: [SeasonsController],
  providers: [SeasonsService, SeasonsRepository],
  exports: [SeasonsRepository],
})
export class SeasonsModule {}
