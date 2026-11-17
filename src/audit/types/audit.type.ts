export type AuditFindingType =
  | 'NEGATIVE_BALANCE'
  | 'TRANSFER_COST_MISMATCH'
  | 'TRANSFER_LEDGER_MISSING'
  | 'DIRECT_NEGOTIATION_INCONSISTENT'
  | 'PRIZE_MISMATCH';

export type AuditFinding = {
  type: AuditFindingType;
  squadId?: string;
  // transferId | directNegotiationId | matchId | phaseId, dependendo do
  // tipo de divergência.
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
  // Null se, por algum motivo, não existe CoinTransaction ligado a essa
  // transferência (TRANSFER_LEDGER_MISSING).
  recordedCost: number | null;
};

export type DirectNegotiationForAudit = {
  id: string;
  coinAmount: number | null;
  coinTransactionCount: number;
  coinTransactionSum: number;
};
