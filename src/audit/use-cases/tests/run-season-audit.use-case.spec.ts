import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_DISCREPANCY_FOUND_EVENT } from '../../../notifications/events';
import { AuditDirectNegotiationsUseCase } from '../audit-direct-negotiations.use-case';
import { AuditSquadBalancesUseCase } from '../audit-squad-balances.use-case';
import { AuditTournamentPrizesUseCase } from '../audit-tournament-prizes.use-case';
import { AuditTransfersUseCase } from '../audit-transfers.use-case';
import { RunSeasonAuditUseCase } from '../run-season-audit.use-case';

const buildUseCase = (findings: unknown[]) => {
  const auditSquadBalancesUseCase = {
    execute: jest.fn().mockResolvedValue(findings),
  } as unknown as AuditSquadBalancesUseCase;
  const auditTransfersUseCase = {
    execute: jest.fn().mockResolvedValue([]),
  } as unknown as AuditTransfersUseCase;
  const auditDirectNegotiationsUseCase = {
    execute: jest.fn().mockResolvedValue([]),
  } as unknown as AuditDirectNegotiationsUseCase;
  const auditTournamentPrizesUseCase = {
    execute: jest.fn().mockResolvedValue([]),
  } as unknown as AuditTournamentPrizesUseCase;
  const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

  const useCase = new RunSeasonAuditUseCase(
    auditSquadBalancesUseCase,
    auditTransfersUseCase,
    auditDirectNegotiationsUseCase,
    auditTournamentPrizesUseCase,
    eventEmitter,
  );

  return { useCase, eventEmitter };
};

describe('RunSeasonAuditUseCase', () => {
  it('emite o evento de divergência quando a auditoria encontra algo', async () => {
    const { useCase, eventEmitter } = buildUseCase([
      { issue: 'saldo negativo' },
    ]);

    await useCase.execute('season-1');

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AUDIT_DISCREPANCY_FOUND_EVENT,
      { seasonId: 'season-1', findingsCount: 1 },
    );
  });

  it('não emite nada quando a auditoria não encontra divergência', async () => {
    const { useCase, eventEmitter } = buildUseCase([]);

    await useCase.execute('season-1');

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
