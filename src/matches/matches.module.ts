import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MatchesController } from './matches.controller';
import { MatchesRepository } from './matches.repository';
import {
  GetMatchDetailUseCase,
  ListTournamentMatchesUseCase,
  ReplaceMatchGoalsUseCase,
  SimulateMatchUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, TournamentsModule],
  controllers: [MatchesController],
  providers: [
    MatchesRepository,
    GetMatchDetailUseCase,
    ListTournamentMatchesUseCase,
    ReplaceMatchGoalsUseCase,
    SimulateMatchUseCase,
  ],
})
export class MatchesModule {}
