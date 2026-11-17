import { Injectable } from '@nestjs/common';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { calculateTraditionalMarketTransferCost } from '../../transfers/utils/transfer-pricing.utils';
import { AuditRepository } from '../audit.repository';
import { AuditFinding } from '../types';
import { resolveTransferAuditFinding } from '../utils';

// Revalida cada transferência pelo ruleset vigente na época dela
// (transfer.createdAt), não pelo atual — ver CLAUDE.md, "auditoria sempre
// avalia cada operação pelo ruleset vigente na época dela".
@Injectable()
export class AuditTransfersUseCase {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  async execute(seasonId: string): Promise<AuditFinding[]> {
    const transfers =
      await this.auditRepository.findTransfersForAudit(seasonId);
    const findings: AuditFinding[] = [];

    for (const transfer of transfers) {
      const { transferPricing } = await this.getActiveRulesetUseCase.execute(
        seasonId,
        transfer.createdAt,
      );

      const expectedCost = calculateTraditionalMarketTransferCost(
        {
          outgoingPlayerOverall: transfer.outgoingPlayerOverall,
          incomingPlayerOverall: transfer.incomingPlayerOverall,
          useCoupon: transfer.useCoupon,
        },
        transferPricing,
      );

      const finding = resolveTransferAuditFinding(transfer, expectedCost);
      if (finding) findings.push(finding);
    }

    return findings;
  }
}
