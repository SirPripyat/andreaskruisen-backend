import {
  DirectNegotiationClauseType,
  DirectNegotiationStatus,
  PositionCode,
} from '../../../generated/prisma/client';
import { NegotiationPlayerSummaryResponseDTO } from '../dto/response';

export type NegotiationDirection = 'sent' | 'received';

export type NegotiationAssignment = {
  // overall usado pra calcular a taxa de negociação quando a janela tem
  // feeEnabled (ver negotiation-fee.utils.ts) — não faz parte do DTO de
  // resposta (outgoingPlayers/incomingPlayers não expõem overall hoje).
  player: NegotiationPlayerSummaryResponseDTO & { overall: number };
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
  // Quem propôs — é quem aparece como requestedBy no Transfer gerado pelo
  // aceite (ver AcceptNegotiationUseCase/TransfersRepository.record).
  proposingUserId: string;
  targetSquadId: string;
  targetTeamId: string;
  // Até 2 jogadores de cada lado (troca multi-jogador, ver
  // v1-transferencias.md) — vazio no caso de compra/venda pura.
  outgoingPlayerIds: string[];
  incomingPlayerIds: string[];
  coinAmount: number | null;
};
