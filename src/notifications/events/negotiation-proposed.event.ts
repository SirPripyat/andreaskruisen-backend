export const NEGOTIATION_PROPOSED_EVENT = 'negotiation.proposed';

export type NegotiationProposedEvent = {
  seasonId: string;
  targetUserId: string;
  negotiationId: string;
  proposingTeamName: string;
};
