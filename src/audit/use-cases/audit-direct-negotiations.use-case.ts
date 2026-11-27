import { Injectable } from '@nestjs/common';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { progressiveFee } from '../../transfers/utils/transfer-pricing.utils';
import { AuditRepository } from '../audit.repository';
import { AuditFinding, DirectNegotiationForAudit } from '../types';
import { resolveDirectNegotiationAuditFinding } from '../utils';

// Negociação direta não tem fórmula de preço pro coinAmount — só dá pra
// checar consistência estrutural do ledger. A taxa de negociação (ver
// NegotiationWindow), quando existe, tem fórmula (mesma faixa progressiva
// do mercado tradicional) e é recalculada pelo ruleset vigente na época do
// aceite (negotiation.resolvedAt), nunca pelo atual — mesmo princípio de
// AuditTransfersUseCase.
@Injectable()
export class AuditDirectNegotiationsUseCase {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  async execute(seasonId: string): Promise<AuditFinding[]> {
    const negotiations =
      await this.auditRepository.findAcceptedNegotiationsForAudit(seasonId);
    const findings: AuditFinding[] = [];

    for (const negotiation of negotiations) {
      const expectedFee = await this.resolveExpectedFee(seasonId, negotiation);
      const finding = resolveDirectNegotiationAuditFinding(
        negotiation,
        expectedFee,
      );
      if (finding) findings.push(finding);
    }

    return findings;
  }

  private async resolveExpectedFee(
    seasonId: string,
    negotiation: DirectNegotiationForAudit,
  ): Promise<number> {
    const { outgoingOverallSum, incomingOverallSum } = negotiation;

    if (
      !negotiation.feeEnabled ||
      outgoingOverallSum === null ||
      incomingOverallSum === null
    )
      return 0;

    const { transferPricing } = await this.getActiveRulesetUseCase.execute(
      seasonId,
      negotiation.resolvedAt ?? undefined,
    );

    const diff = Math.abs(incomingOverallSum - outgoingOverallSum);

    return progressiveFee(diff, transferPricing.progressiveFeeBands);
  }
}
