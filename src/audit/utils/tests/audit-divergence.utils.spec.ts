import { DirectNegotiationForAudit, TransferForAudit } from '../../types';
import {
  resolveDirectNegotiationAuditFinding,
  resolveTransferAuditFinding,
} from '../audit-divergence.utils';

const baseTransfer: TransferForAudit = {
  id: 't1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  outgoingPlayerOverall: 80,
  incomingPlayerOverall: 85,
  useCoupon: false,
  feeEnabled: true,
  recordedCost: 70,
};

describe('resolveTransferAuditFinding', () => {
  it('sem divergência quando o custo lançado bate com o esperado', () => {
    expect(resolveTransferAuditFinding(baseTransfer, 70)).toBeNull();
  });

  it('TRANSFER_COST_MISMATCH quando o custo lançado difere do esperado', () => {
    const finding = resolveTransferAuditFinding(baseTransfer, 90);
    expect(finding).toMatchObject({
      type: 'TRANSFER_COST_MISMATCH',
      referenceId: 't1',
      expectedAmount: 90,
      actualAmount: 70,
    });
  });

  it('TRANSFER_LEDGER_MISSING quando não existe custo lançado', () => {
    const finding = resolveTransferAuditFinding(
      { ...baseTransfer, recordedCost: null },
      70,
    );
    expect(finding).toMatchObject({
      type: 'TRANSFER_LEDGER_MISSING',
      referenceId: 't1',
    });
  });
});

const baseNegotiation: DirectNegotiationForAudit = {
  id: 'n1',
  coinAmount: 20,
  coinTransactionCount: 2,
  coinTransactionSum: 0,
  resolvedAt: new Date('2026-01-01T00:00:00Z'),
  outgoingPlayerOverall: 80,
  incomingPlayerOverall: 85,
  feeEnabled: true,
  recordedFee: 20,
};

describe('resolveDirectNegotiationAuditFinding', () => {
  it('sem divergência quando tem 2 lançamentos somando 0, coinAmount definido e taxa bate', () => {
    expect(
      resolveDirectNegotiationAuditFinding(baseNegotiation, 20),
    ).toBeNull();
  });

  it('sem divergência quando não envolve moeda, não tem nenhum lançamento e não tem taxa', () => {
    expect(
      resolveDirectNegotiationAuditFinding(
        {
          ...baseNegotiation,
          coinAmount: null,
          coinTransactionCount: 0,
          coinTransactionSum: 0,
          feeEnabled: false,
          recordedFee: 0,
        },
        0,
      ),
    ).toBeNull();
  });

  it('DIRECT_NEGOTIATION_INCONSISTENT quando a soma não é 0', () => {
    const finding = resolveDirectNegotiationAuditFinding(
      { ...baseNegotiation, coinTransactionSum: 5 },
      20,
    );
    expect(finding).toMatchObject({
      type: 'DIRECT_NEGOTIATION_INCONSISTENT',
      referenceId: 'n1',
      actualAmount: 5,
    });
  });

  it('DIRECT_NEGOTIATION_INCONSISTENT quando a contagem de lançamentos não bate', () => {
    const finding = resolveDirectNegotiationAuditFinding(
      { ...baseNegotiation, coinTransactionCount: 1 },
      20,
    );
    expect(finding).toMatchObject({ type: 'DIRECT_NEGOTIATION_INCONSISTENT' });
  });

  it('DIRECT_NEGOTIATION_FEE_MISMATCH quando a taxa lançada difere da esperada', () => {
    const finding = resolveDirectNegotiationAuditFinding(baseNegotiation, 30);
    expect(finding).toMatchObject({
      type: 'DIRECT_NEGOTIATION_FEE_MISMATCH',
      referenceId: 'n1',
      expectedAmount: 30,
      actualAmount: 20,
    });
  });
});
