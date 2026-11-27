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
  // Até 2 jogadores de cada lado (troca multi-jogador, ver
  // v1-transferencias.md) — vazio numa compra/venda pura.
  outgoingPlayers: NegotiationPlayerSummaryResponseDTO[];
  incomingPlayers: NegotiationPlayerSummaryResponseDTO[];
  clauses: NegotiationClauseResponseDTO[];
  // Somados a partir do Transfer gerado pelo aceite (ver
  // NegotiationsRepository.toResponseDTO) — nulos enquanto
  // PENDING/REJECTED, já que nenhum Transfer foi gerado ainda.
  outgoingOverallSum: number | null;
  incomingOverallSum: number | null;
  feeEnabled: boolean | null;
};
