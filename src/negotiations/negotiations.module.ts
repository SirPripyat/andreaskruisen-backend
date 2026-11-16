import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsModule } from '../squads/squads.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { NegotiationsController } from './negotiations.controller';
import { NegotiationsFacade } from './negotiations.facade';
import { NegotiationsRepository } from './negotiations.repository';
import {
  AcceptNegotiationUseCase,
  ListNegotiationsUseCase,
  ProposeNegotiationUseCase,
  RejectNegotiationUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, SquadsModule, TournamentsModule],
  controllers: [NegotiationsController],
  providers: [
    NegotiationsRepository,
    NegotiationsFacade,
    ProposeNegotiationUseCase,
    AcceptNegotiationUseCase,
    RejectNegotiationUseCase,
    ListNegotiationsUseCase,
  ],
})
export class NegotiationsModule {}
