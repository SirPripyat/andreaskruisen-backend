export const AUDIT_DISCREPANCY_FOUND_EVENT = 'audit.discrepancy-found';

export type AuditDiscrepancyFoundEvent = {
  seasonId: string;
  findingsCount: number;
};
