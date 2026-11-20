import {
  DirectNegotiation,
  DirectNegotiationClause,
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

export type NegotiationClauseResponseDTO = Pick<
  DirectNegotiationClause,
  'id' | 'type' | 'amount' | 'matchesCount' | 'terms'
> & {
  player: NegotiationPlayerSummaryResponseDTO;
};

export type NegotiationResponseDTO = DirectNegotiation & {
  proposingSquad: NegotiationSquadSummaryResponseDTO;
  targetSquad: NegotiationSquadSummaryResponseDTO;
  outgoingPlayer: NegotiationPlayerSummaryResponseDTO | null;
  incomingPlayer: NegotiationPlayerSummaryResponseDTO | null;
  clauses: NegotiationClauseResponseDTO[];
  // Snapshotados no Transfer gerado pelo aceite (ver
  // NegotiationsRepository.toResponseDTO) — nulos enquanto
  // PENDING/REJECTED, já que nenhum Transfer foi gerado ainda.
  outgoingPlayerOverall: number | null;
  incomingPlayerOverall: number | null;
  feeEnabled: boolean | null;
};
