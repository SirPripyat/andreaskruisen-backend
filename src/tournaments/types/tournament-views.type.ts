import {
  PositionCode,
  TournamentFormat,
} from '../../../generated/prisma/client';
import { GroupStanding } from '../utils/group-standings.utils';
import {
  MatchPenalties,
  PhaseSummary,
  TeamOwner,
  TeamSummary,
} from './tournaments.type';

export type TournamentSummary = {
  id: string;
  seasonId: string;
  name: string;
  format: TournamentFormat;
  maxTeams: number;
  createdAt: Date;
  // Fase em que o torneio está agora (a de maior order). Fases seguintes só
  // existem depois que a atual termina — ver geração por fase na criação.
  currentPhase: PhaseSummary | null;
};

export type StandingWithOwner = GroupStanding & { owner: TeamOwner | null };

export type MatchupTeam = TeamSummary & {
  owner: TeamOwner | null;
};

export type Matchup = {
  id: string;
  homeTeam: MatchupTeam;
  awayTeam: MatchupTeam;
};

export type TournamentSituation = {
  phase: PhaseSummary;
} & (
  | { groups: Record<string, StandingWithOwner[]>; matches?: never }
  | { matches: Matchup[]; groups?: never }
);

export type MatchListItem = {
  id: string;
  groupLabel: string | null;
  round: number | null;
  // null = partida ainda não jogada (ver Match.playedAt).
  homeScore: number | null;
  awayScore: number | null;
  // Resultado dos pênaltis quando a partida é de mata-mata e empata no
  // tempo normal (ver tournament-champion.ts) — null quando não houve.
  penalties: MatchPenalties | null;
  homeTeam: MatchupTeam;
  awayTeam: MatchupTeam;
  // true = a fase seguinte já foi gerada a partir desta (ver
  // AdvancePhaseUseCase); resultado não pode mais ser editado.
  locked: boolean;
};

export type MatchesByPhase = {
  phase: PhaseSummary;
  matches: MatchListItem[];
};

export type MatchPlayerOption = {
  id: string;
  name: string;
  photoUrl: string;
  position: PositionCode;
};

export type MatchTeamWithPlayers = TeamSummary & {
  players: MatchPlayerOption[];
};

export type MatchGoal = {
  id: string;
  scorer: MatchPlayerOption;
  assist: MatchPlayerOption | null;
};

export type GoalLeader = {
  player: MatchPlayerOption;
  team: TeamSummary;
  count: number;
};

export type NextMatchSummary = {
  id: string;
  phaseName: string;
  groupLabel: string | null;
  round: number | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
};

export type TournamentDashboard = {
  name: string;
  format: TournamentFormat;
  maxTeams: number;
  createdAt: Date;
  // Fase em que o torneio está agora (a de maior order).
  currentPhase: PhaseSummary | null;
  totalMatches: number;
  playedMatches: number;
  remainingMatches: number;
  topScorer: GoalLeader | null;
  topAssist: GoalLeader | null;
  nextMatch: NextMatchSummary | null;
};

export type TeamTitle = {
  tournamentId: string;
  tournamentName: string;
  format: TournamentFormat;
  seasonId: string;
  seasonName: string;
};
