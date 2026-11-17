import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import {
  AuditDirectNegotiationsUseCase,
  AuditSquadBalancesUseCase,
  AuditTournamentPrizesUseCase,
  AuditTransfersUseCase,
  RunSeasonAuditUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, RulesetsModule, TournamentsModule],
  controllers: [AuditController],
  providers: [
    AuditRepository,
    AuditSquadBalancesUseCase,
    AuditTransfersUseCase,
    AuditDirectNegotiationsUseCase,
    AuditTournamentPrizesUseCase,
    RunSeasonAuditUseCase,
  ],
})
export class AuditModule {}
