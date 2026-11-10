import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsController } from './squads.controller';
import { SquadsRepository } from './squads.repository';
import {
  AssignSquadUseCase,
  ChooseSquadUseCase,
  GetMySquadUseCase,
  GetSquadLineupUseCase,
  ListSquadRosterUseCase,
  ListSquadsUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [SquadsController],
  providers: [
    SquadsRepository,
    ListSquadsUseCase,
    ChooseSquadUseCase,
    AssignSquadUseCase,
    ListSquadRosterUseCase,
    GetSquadLineupUseCase,
    GetMySquadUseCase,
  ],
  exports: [SquadsRepository],
})
export class SquadsModule {}
