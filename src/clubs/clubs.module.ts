import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { ClubsController } from './clubs.controller';
import { ClubsFacade } from './clubs.facade';
import { ClubsRepository } from './clubs.repository';
import {
  FindClubOrThrowUseCase,
  GetClubTitlesUseCase,
  GetClubUseCase,
  ListClubsUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, TeamsModule, TournamentsModule],
  controllers: [ClubsController],
  providers: [
    ClubsRepository,
    ClubsFacade,
    FindClubOrThrowUseCase,
    ListClubsUseCase,
    GetClubUseCase,
    GetClubTitlesUseCase,
  ],
})
export class ClubsModule {}
