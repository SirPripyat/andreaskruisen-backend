import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_DISCREPANCY_FOUND_EVENT } from '../../notifications/events';
import { SeasonAuditReport } from '../types';
import { AuditDirectNegotiationsUseCase } from './audit-direct-negotiations.use-case';
import { AuditSquadBalancesUseCase } from './audit-squad-balances.use-case';
import { AuditTournamentPrizesUseCase } from './audit-tournament-prizes.use-case';
import { AuditTransfersUseCase } from './audit-transfers.use-case';

@Injectable()
export class RunSeasonAuditUseCase {
  constructor(
    private readonly auditSquadBalancesUseCase: AuditSquadBalancesUseCase,
    private readonly auditTransfersUseCase: AuditTransfersUseCase,
    private readonly auditDirectNegotiationsUseCase: AuditDirectNegotiationsUseCase,
    private readonly auditTournamentPrizesUseCase: AuditTournamentPrizesUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(seasonId: string): Promise<SeasonAuditReport> {
    const findings = (
      await Promise.all([
        this.auditSquadBalancesUseCase.execute(seasonId),
        this.auditTransfersUseCase.execute(seasonId),
        this.auditDirectNegotiationsUseCase.execute(seasonId),
        this.auditTournamentPrizesUseCase.execute(seasonId),
      ])
    ).flat();

    if (findings.length > 0)
      this.eventEmitter.emit(AUDIT_DISCREPANCY_FOUND_EVENT, {
        seasonId,
        findingsCount: findings.length,
      });

    return {
      seasonId,
      generatedAt: new Date(),
      findings,
    };
  }
}
