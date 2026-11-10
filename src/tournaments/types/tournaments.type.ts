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
  awayTeam: TeamSummary;
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
