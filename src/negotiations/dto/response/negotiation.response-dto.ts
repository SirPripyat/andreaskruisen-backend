import {
  DirectNegotiation,
  Player,
  Team,
  User,
} from '../../../../generated/prisma/client';

export type NegotiationPlayerSummaryResponseDTO = Pick<
  Player,
  'id' | 'name' | 'photoUrl'
>;

export type NegotiationSquadSummaryResponseDTO = {
  squadId: string;
  user: Pick<User, 'id' | 'name'>;
  team: Pick<Team, 'id' | 'name' | 'crestUrl'>;
};

export type NegotiationResponseDTO = DirectNegotiation & {
  proposingSquad: NegotiationSquadSummaryResponseDTO;
  targetSquad: NegotiationSquadSummaryResponseDTO;
  outgoingPlayer: NegotiationPlayerSummaryResponseDTO | null;
  incomingPlayer: NegotiationPlayerSummaryResponseDTO | null;
};
