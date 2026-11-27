import { PhaseType, PositionCode } from '../../../generated/prisma/client';

export type PhaseSummary = {
  id: string;
  type: PhaseType;
  order: number;
  name: string;
};

export type GroupPhaseMatch = {
  homeTeamId: string;
  awayTeamId: string;
  groupLabel: string;
  // null = partida ainda não jogada. Ver GoalsByTeam no service pra como o
  // placar é derivado dos Goal da partida.
  playedAt: Date | null;
  goalScorerTeamIds: string[];
};

export type TeamSummary = {
  id: string;
  name: string;
  crestUrl: string;
};

export type MatchPenalties = {
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
};

export type MatchWithTeams = {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  goalScorerTeamIds: string[];
  penalties: MatchPenalties | null;
  homeTeam: TeamSummary;
  // null = bye (ver buildGroupStageQualifiersBracket).
  awayTeam: TeamSummary | null;
};

export type PlayerSummary = {
  id: string;
  name: string;
  photoUrl: string;
  teamId: string;
  // Posição principal (isPrimary) — usada pro front ordenar os seletores de
  // artilheiro/assistência (ataque antes de meio, defesa e goleiro).
  position: PositionCode;
};

export type TeamOwner = {
  id: string;
  name: string;
};

// Linha crua de ranking de artilheiros/assistências: teamId vem do snapshot
// Goal.teamId (time no momento daquele gol), nunca de Player.teamId — um
// jogador trocado de time no meio do torneio não pode "reescrever" os gols
// que já marcou por outro time (ver ResolveGoalLeadersUseCase).
export type GoalLeaderRow = {
  playerId: string;
  teamId: string;
  count: number;
};

// Tipos de CoinTransaction reconciliáveis automaticamente por
// AwardTournamentPrizeUseCase (ver tournament-prizes.utils.ts) — exclui
// INITIAL/TRANSFER/TRANSFER_FEE/ADJUSTMENT, que não nascem daqui.
export type TournamentPrizeType =
  | 'WIN'
  | 'DRAW'
  | 'LOSS'
  | 'RANKING'
  | 'PRIZE_PHASE'
  | 'CHAMPION'
  | 'RUNNER_UP';
