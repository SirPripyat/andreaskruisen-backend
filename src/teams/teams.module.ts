import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TeamsController } from './teams.controller';
import { TeamsFacade } from './teams.facade';
import { TeamsRepository } from './teams.repository';
import {
  FindTeamOrThrowUseCase,
  GetTeamStatsUseCase,
  GetTeamTitlesUseCase,
  GetTeamUseCase,
  ListTeamsUseCase,
  UpdateTeamUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, TournamentsModule],
  controllers: [TeamsController],
  providers: [
    TeamsRepository,
    TeamsFacade,
    FindTeamOrThrowUseCase,
    GetTeamStatsUseCase,
    ListTeamsUseCase,
    GetTeamUseCase,
    GetTeamTitlesUseCase,
    UpdateTeamUseCase,
  ],
  exports: [TeamsRepository],
})
export class TeamsModule {}
