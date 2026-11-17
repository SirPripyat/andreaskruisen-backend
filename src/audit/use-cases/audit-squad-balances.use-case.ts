import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../audit.repository';
import { AuditFinding } from '../types';

@Injectable()
export class AuditSquadBalancesUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(seasonId: string): Promise<AuditFinding[]> {
    const balances = await this.auditRepository.findSquadBalances(seasonId);

    return balances
      .filter((squad) => squad.balance < 0)
      .map((squad) => ({
        type: 'NEGATIVE_BALANCE' as const,
        squadId: squad.squadId,
        actualAmount: squad.balance,
        message: `Saldo negativo: ${squad.balance} moedas`,
      }));
  }
}
