import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonContextGuard } from './season-context.guard';
import { SeasonsController } from './seasons.controller';
import { SeasonsRepository } from './seasons.repository';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [AuthModule],
  controllers: [SeasonsController],
  providers: [SeasonsService, SeasonsRepository, SeasonContextGuard],
  exports: [SeasonsRepository, SeasonsService, SeasonContextGuard],
})
export class SeasonsModule {}
