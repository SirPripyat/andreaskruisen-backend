import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaguesController } from './leagues.controller';
import { LeaguesFacade } from './leagues.facade';
import { LeaguesRepository } from './leagues.repository';
import {
  FindLeagueUseCase,
  ListLeaguesUseCase,
  UpdateLeagueUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule],
  controllers: [LeaguesController],
  providers: [
    LeaguesFacade,
    ListLeaguesUseCase,
    FindLeagueUseCase,
    UpdateLeagueUseCase,
    LeaguesRepository,
  ],
  exports: [LeaguesRepository],
})
export class LeaguesModule {}
