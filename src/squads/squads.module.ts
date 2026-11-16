import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsController } from './squads.controller';
import { SquadsFacade } from './squads.facade';
import { SquadsRepository } from './squads.repository';
import {
  AssignSquadUseCase,
  ChangeSquadFormationUseCase,
  ChooseSquadUseCase,
  GetMySquadUseCase,
  GetSquadLineupUseCase,
  ListSquadRosterUseCase,
  ListSquadsUseCase,
  SetLineupStarterUseCase,
  SwapLineupStarterUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [SquadsController],
  providers: [
    SquadsFacade,
    SquadsRepository,
    ListSquadsUseCase,
    ChooseSquadUseCase,
    AssignSquadUseCase,
    ListSquadRosterUseCase,
    GetSquadLineupUseCase,
    GetMySquadUseCase,
    SwapLineupStarterUseCase,
    SetLineupStarterUseCase,
    ChangeSquadFormationUseCase,
  ],
  exports: [SquadsRepository],
})
export class SquadsModule {}
