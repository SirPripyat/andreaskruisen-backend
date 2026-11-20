import {
  AuditFinding,
  DirectNegotiationForAudit,
  TransferForAudit,
} from '../types';

// Compara o custo lançado (já resolvido no TransferForAudit) com o custo
// recalculado pelo ruleset vigente na época da transferência. Null =
// nenhuma divergência.
export const resolveTransferAuditFinding = (
  transfer: TransferForAudit,
  expectedCost: number,
): AuditFinding | null => {
  if (transfer.recordedCost === null) {
    return {
      type: 'TRANSFER_LEDGER_MISSING',
      referenceId: transfer.id,
      message: 'Transferência sem lançamento de custo no ledger',
    };
  }

  if (transfer.recordedCost === expectedCost) return null;

  return {
    type: 'TRANSFER_COST_MISMATCH',
    referenceId: transfer.id,
    expectedAmount: expectedCost,
    actualAmount: transfer.recordedCost,
    message: `Custo lançado (${transfer.recordedCost}) difere do calculado pelo ruleset vigente em ${transfer.createdAt.toISOString()} (${expectedCost})`,
  };
};

// Negociação direta não tem fórmula de preço pro coinAmount (livremente
// acordado) — só precisa bater estruturalmente: 0 lançamentos se não
// envolve moeda, 2 (sinais opostos, soma 0) se envolve. A taxa de
// negociação (ver NegotiationWindow) é separada: tem fórmula (reaproveita
// transferPricing.progressiveFeeBands), por isso é comparada contra um
// valor recalculado (expectedFee), não só checada estruturalmente.
export const resolveDirectNegotiationAuditFinding = (
  negotiation: DirectNegotiationForAudit,
  expectedFee: number,
): AuditFinding | null => {
  const expectedCount = negotiation.coinAmount ? 2 : 0;
  const isConsistent =
    negotiation.coinTransactionCount === expectedCount &&
    negotiation.coinTransactionSum === 0;

  if (!isConsistent) {
    return {
      type: 'DIRECT_NEGOTIATION_INCONSISTENT',
      referenceId: negotiation.id,
      expectedAmount: 0,
      actualAmount: negotiation.coinTransactionSum,
      message: `Negociação direta com lançamentos inconsistentes (esperado ${expectedCount} lançamento(s) somando 0; encontrado ${negotiation.coinTransactionCount} somando ${negotiation.coinTransactionSum})`,
    };
  }

  if (negotiation.recordedFee !== expectedFee) {
    return {
      type: 'DIRECT_NEGOTIATION_FEE_MISMATCH',
      referenceId: negotiation.id,
      expectedAmount: expectedFee,
      actualAmount: negotiation.recordedFee,
      message: `Taxa de negociação lançada (${negotiation.recordedFee}) difere da calculada pelo ruleset vigente em ${negotiation.resolvedAt?.toISOString()} (${expectedFee})`,
    };
  }

  return null;
};
