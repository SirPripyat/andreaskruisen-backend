import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsModule } from '../squads/squads.module';
import { TournamentsController } from './tournaments.controller';
import { TournamentsFacade } from './tournaments.facade';
import { TournamentsRepository } from './tournaments.repository';
import {
  AdvancePhaseUseCase,
  AwardTournamentPrizeUseCase,
  BuildGroupStandingsUseCase,
  CreateTournamentUseCase,
  FindTournamentOrThrowUseCase,
  FinishTournamentUseCase,
  GetChampionTeamIdUseCase,
  GetHallOfFameUseCase,
  GetTitlesForTeamUseCase,
  GetTopAssistsUseCase,
  GetTopScorersUseCase,
  GetTournamentDashboardUseCase,
  GetTournamentFixturesUseCase,
  GetTournamentGroupUseCase,
  GetTournamentSituationUseCase,
  GetTournamentUseCase,
  HasActiveTournamentUseCase,
  IsTournamentFinishedUseCase,
  ListMyTournamentsUseCase,
  ListTournamentsUseCase,
  RemoveTournamentUseCase,
  ResolveGoalLeadersUseCase,
  UpdateTournamentUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, RulesetsModule, SquadsModule],
  controllers: [TournamentsController],
  providers: [
    TournamentsRepository,
    TournamentsFacade,
    FindTournamentOrThrowUseCase,
    BuildGroupStandingsUseCase,
    ResolveGoalLeadersUseCase,
    CreateTournamentUseCase,
    ListTournamentsUseCase,
    ListMyTournamentsUseCase,
    HasActiveTournamentUseCase,
    IsTournamentFinishedUseCase,
    FinishTournamentUseCase,
    GetTournamentUseCase,
    GetTournamentSituationUseCase,
    GetTournamentGroupUseCase,
    GetTournamentFixturesUseCase,
    GetTopScorersUseCase,
    GetTopAssistsUseCase,
    GetHallOfFameUseCase,
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
