import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TournamentsController } from './tournaments.controller';
import { TournamentsRepository } from './tournaments.repository';
import { TournamentsService } from './tournaments.service';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentsRepository],
})
export class TournamentsModule {}
