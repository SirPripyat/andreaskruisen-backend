import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsController } from './squads.controller';
import { SquadsRepository } from './squads.repository';
import { SquadsService } from './squads.service';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [SquadsController],
  providers: [SquadsService, SquadsRepository],
})
export class SquadsModule {}
