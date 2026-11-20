export const NEGOTIATION_ACCEPTED_EVENT = 'negotiation.accepted';

export type NegotiationAcceptedEvent = {
  seasonId: string;
  proposingUserId: string;
  negotiationId: string;
  targetTeamName: string;
};
