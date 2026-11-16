import {
  DirectNegotiationClauseType,
  DirectNegotiationStatus,
  PositionCode,
} from '../../../generated/prisma/client';
import { NegotiationPlayerSummaryResponseDTO } from '../dto/response';

export type NegotiationAssignment = {
  player: NegotiationPlayerSummaryResponseDTO;
  team: { id: string; name: string; crestUrl: string };
  position: PositionCode;
};

// Forma "achatada" de uma cláusula já validada (ver ProposeNegotiationUseCase),
// pronta pra gravar — amount/matchesCount nulos quando o tipo não usa o campo
// (ver NegotiationClauseInputSchema, que exige o campo certo por tipo).
export type NegotiationClauseInput = {
  type: DirectNegotiationClauseType;
  playerId: string;
  amount: number | null;
  matchesCount: number | null;
  terms: string | null;
};

// Visão completa de uma negociação com os ids de time resolvidos — usada
// internamente por AcceptNegotiationUseCase/RejectNegotiationUseCase, que
// precisam do teamId de cada lado além dos ids de squad já presentes no
// DirectNegotiation (ver NegotiationsRepository.findByIdWithTeams).
export type NegotiationWithTeams = {
  id: string;
  seasonId: string;
  status: DirectNegotiationStatus;
  proposingSquadId: string;
  proposingTeamId: string;
  targetSquadId: string;
  targetTeamId: string;
  outgoingPlayerId: string | null;
  incomingPlayerId: string | null;
  coinAmount: number | null;
};
