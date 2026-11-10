import { PhaseType, PositionCode } from '../../../generated/prisma/client';
import { PaginatedResult } from '../../commons/pagination';
import {
  MatchGoal,
  MatchListItem,
  MatchPenalties,
  MatchTeamWithPlayers,
  PhaseSummary,
  PlayerSummary,
  TeamSummary,
} from '../../tournaments/types';

export type MatchForGoals = {
  id: string;
  tournamentId: string;
  seasonId: string;
  phaseId: string;
  phaseOrder: number;
  phaseType: PhaseType;
  homeTeamId: string;
  awayTeamId: string;
  playedAt: Date | null;
};

export type SimulationRosterPlayer = {
  id: string;
  teamId: string;
  overallRating: number;
  // Atributo "penalties" (0-99) mais recente do jogador — usado pra
  // calcular a chance de conversão de quem for sorteado pra cobrar na
  // disputa de pênaltis (ver simulatePenaltyShootout).
  penaltyRating: number;
  position: PositionCode;
};

export type GoalWithPlayers = {
  id: string;
  scorer: PlayerSummary;
  assist: PlayerSummary | null;
};

export type MatchDetail = {
  id: string;
  tournamentId: string;
  seasonId: string;
  phaseOrder: number;
  phaseType: PhaseType;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  penalties: MatchPenalties | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  goals: GoalWithPlayers[];
};

export type MatchDetailResponse = {
  id: string;
  groupLabel: string | null;
  round: number | null;
  phaseType: PhaseType;
  playedAt: Date | null;
  penalties: MatchPenalties | null;
  homeTeam: MatchTeamWithPlayers;
  awayTeam: MatchTeamWithPlayers;
  goals: MatchGoal[];
  locked: boolean;
};

export type MatchesPage = PaginatedResult<MatchListItem> & {
  phase: PhaseSummary;
};

export type Goal = {
  scorerId: string;
  assistId: string | null;
  teamId: string;
};

export type SimulatedPenaltyShootout = {
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
};

export type SimulationPlayer = {
  id: string;
  position: PositionCode;
  overallRating: number;
  penaltyRating: number;
};

export type SimulatedGoal = {
  scorerId: string;
  assistId: string | null;
};

export type SimulatedMatchResult = {
  homeGoals: SimulatedGoal[];
  awayGoals: SimulatedGoal[];
};
