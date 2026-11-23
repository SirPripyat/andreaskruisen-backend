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

export type MyStanding = Pick<
  GroupStanding,
  'position' | 'points' | 'goalDifference' | 'last5'
>;

export type TournamentSummary = {
  id: string;
  seasonId: string;
  name: string;
  format: TournamentFormat;
  maxTeams: number;
  createdAt: Date;
  // null = em andamento; setado só via FinishTournamentUseCase.
  finishedAt: Date | null;
  // Fase em que o torneio está agora (a de maior order). Fases seguintes só
  // existem depois que a atual termina — ver geração por fase na criação.
  currentPhase: PhaseSummary | null;
};

export type StandingWithOwner = GroupStanding & { owner: TeamOwner | null };

export type MatchupTeam = TeamSummary & {
  owner: TeamOwner | null;
};

// Time que venceu a fase decisiva do torneio (ver GetChampionTeamIdUseCase);
// null enquanto o torneio não foi encerrado (FinishTournamentUseCase) ou se
// a fase decisiva não tem como ter um campeão único.
export type TournamentListItem = TournamentSummary & {
  champion: MatchupTeam | null;
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

// Visão do torneio do ponto de vista do meu time (ver ListMyTournamentsUseCase):
// mesmos campos de TournamentSummary, mais minha posição na fase atual e meu
// próximo confronto. myStanding é null quando a fase atual é mata-mata (não
// existe classificação ali) ou quando ainda não há fase gerada.
export type MyTournamentSummary = TournamentSummary & {
  myStanding: MyStanding | null;
  nextMatch: NextMatchSummary | null;
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

// GoalLeader de hall da fama, acrescido de quantos jogos e títulos o TIME
// dele (não o jogador: não existe registro de presença em partida nem de
// quem estava no elenco campeão, só de quem marcou/assistiu — ver
// GetHallOfFameUseCase) teve no formato dentro da temporada, e da média de
// gol/assistência por partida resultante. Serve só de aproximação: um
// jogador que trocou de time no meio do caminho tem média e títulos
// calculados sobre o time que mais o viu balançar as redes.
// Quantas posições o jogador subiu (positivo) ou desceu (negativo) nesse
// ranking desde antes do último torneio encerrado do formato entrar na
// conta — ver GetHallOfFameUseCase. Null quando ele não aparecia no
// ranking anterior (estreante ou saiu da lista e voltou).
export type HallOfFameLeader = GoalLeader & {
  matchesPlayed: number;
  average: number;
  titles: number;
  positionChange: number | null;
};

// Líderes de gols/assistências de uma temporada, somados entre todos os
// torneios já encerrados daquele formato (ver GetHallOfFameUseCase) — não
// de um torneio só, como GoalLeader em TournamentDashboard.
export type HallOfFame = {
  topScorers: HallOfFameLeader[];
  topAssists: HallOfFameLeader[];
};
