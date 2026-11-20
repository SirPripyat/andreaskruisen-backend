export type AuditFindingType =
  | 'NEGATIVE_BALANCE'
  | 'TRANSFER_COST_MISMATCH'
  | 'TRANSFER_LEDGER_MISSING'
  | 'DIRECT_NEGOTIATION_INCONSISTENT'
  | 'DIRECT_NEGOTIATION_FEE_MISMATCH'
  | 'PRIZE_MISMATCH';

export type AuditFinding = {
  type: AuditFindingType;
  squadId?: string;
  // transferId (mercado ou negociação, ver Transfer.originType) |
  // negotiationId | matchId | phaseId, dependendo do tipo de divergência.
  referenceId?: string;
  expectedAmount?: number;
  actualAmount?: number;
  message: string;
};

export type SeasonAuditReport = {
  seasonId: string;
  generatedAt: Date;
  findings: AuditFinding[];
};

export type SquadBalance = {
  squadId: string;
  balance: number;
};

export type TransferForAudit = {
  id: string;
  createdAt: Date;
  outgoingPlayerOverall: number;
  incomingPlayerOverall: number;
  useCoupon: boolean;
  // Snapshot de NegotiationWindow.feeEnabled na hora da troca (ver
  // Transfer.feeEnabled) — a auditoria recalcula o custo com esse valor,
  // nunca com o estado atual da janela.
  feeEnabled: boolean;
  // Null se, por algum motivo, não existe CoinTransaction ligado a essa
  // transferência (TRANSFER_LEDGER_MISSING).
  recordedCost: number | null;
};

export type DirectNegotiationForAudit = {
  id: string;
  coinAmount: number | null;
  coinTransactionCount: number;
  coinTransactionSum: number;
  // Null quando a negociação foi uma compra/venda pura (não é troca) —
  // nesse caso a taxa de negociação nunca se aplica, não importa o
  // feeEnabled snapshotado.
  resolvedAt: Date | null;
  outgoingPlayerOverall: number | null;
  incomingPlayerOverall: number | null;
  feeEnabled: boolean | null;
  // Soma dos CoinTransaction tipo DIRECT_NEGOTIATION_FEE ligados a essa
  // negociação (valor positivo) — 0 se não houve taxa.
  recordedFee: number;
};
