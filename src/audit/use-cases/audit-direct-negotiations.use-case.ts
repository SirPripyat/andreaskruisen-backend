import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../audit.repository';
import { AuditFinding } from '../types';
import { resolveDirectNegotiationAuditFinding } from '../utils';

// Negociação direta não tem fórmula de preço (coinAmount é livremente
// acordado entre as partes) — só dá pra checar consistência estrutural
// do ledger: 0 lançamentos se não envolve moeda, 2 lançamentos (sinais
// opostos, soma 0) se envolve.
@Injectable()
export class AuditDirectNegotiationsUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(seasonId: string): Promise<AuditFinding[]> {
    const negotiations =
      await this.auditRepository.findAcceptedNegotiationsForAudit(seasonId);

    return negotiations
      .map((negotiation) => resolveDirectNegotiationAuditFinding(negotiation))
      .filter((finding): finding is AuditFinding => finding !== null);
  }
}
