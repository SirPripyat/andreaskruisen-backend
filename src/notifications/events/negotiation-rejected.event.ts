export const NEGOTIATION_REJECTED_EVENT = 'negotiation.rejected';

export type NegotiationRejectedEvent = {
  seasonId: string;
  proposingUserId: string;
  negotiationId: string;
  targetTeamName: string;
};
