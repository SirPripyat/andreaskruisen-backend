import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TournamentsController } from './tournaments.controller';
import { TournamentsRepository } from './tournaments.repository';
import {
  AdvancePhaseUseCase,
  AwardTournamentPrizeUseCase,
  BuildGroupStandingsUseCase,
  CreateTournamentUseCase,
  FindTournamentOrThrowUseCase,
  GetChampionTeamIdUseCase,
  GetTitlesForTeamUseCase,
  GetTopAssistsUseCase,
  GetTopScorersUseCase,
  GetTournamentDashboardUseCase,
  GetTournamentFixturesUseCase,
  GetTournamentSituationUseCase,
  GetTournamentUseCase,
  HasActiveTournamentUseCase,
  ListTournamentsUseCase,
  RemoveTournamentUseCase,
  ResolveGoalLeadersUseCase,
  UpdateTournamentUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, RulesetsModule],
  controllers: [TournamentsController],
  providers: [
    TournamentsRepository,
    FindTournamentOrThrowUseCase,
    BuildGroupStandingsUseCase,
    ResolveGoalLeadersUseCase,
    CreateTournamentUseCase,
    ListTournamentsUseCase,
    HasActiveTournamentUseCase,
    GetTournamentUseCase,
    GetTournamentSituationUseCase,
    GetTournamentFixturesUseCase,
    GetTopScorersUseCase,
    GetTopAssistsUseCase,
    GetTournamentDashboardUseCase,
    UpdateTournamentUseCase,
    RemoveTournamentUseCase,
    AdvancePhaseUseCase,
    AwardTournamentPrizeUseCase,
    GetChampionTeamIdUseCase,
    GetTitlesForTeamUseCase,
  ],
  exports: [
    TournamentsRepository,
    FindTournamentOrThrowUseCase,
    HasActiveTournamentUseCase,
    ResolveGoalLeadersUseCase,
    GetTitlesForTeamUseCase,
    AwardTournamentPrizeUseCase,
    BuildGroupStandingsUseCase,
  ],
})
export class TournamentsModule {}
