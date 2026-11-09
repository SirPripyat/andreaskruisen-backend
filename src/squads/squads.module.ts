import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsAssignController, SquadsController } from './squads.controller';
import { SquadsRepository } from './squads.repository';
import { SquadsService } from './squads.service';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [SquadsController, SquadsAssignController],
  providers: [SquadsService, SquadsRepository],
  exports: [SquadsRepository],
})
export class SquadsModule {}
