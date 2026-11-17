import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MatchesController } from './matches.controller';
import { MatchesFacade } from './matches.facade';
import { MatchesRepository } from './matches.repository';
import {
  GetMatchDetailUseCase,
  ListTournamentMatchesUseCase,
  ReplaceMatchGoalsUseCase,
  SimulateMatchUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, TournamentsModule, RulesetsModule],
  controllers: [MatchesController],
  providers: [
    MatchesRepository,
    MatchesFacade,
    GetMatchDetailUseCase,
    ListTournamentMatchesUseCase,
    ReplaceMatchGoalsUseCase,
    SimulateMatchUseCase,
  ],
})
export class MatchesModule {}
