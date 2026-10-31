import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

@Module({
  imports: [AuthModule, TournamentsModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
