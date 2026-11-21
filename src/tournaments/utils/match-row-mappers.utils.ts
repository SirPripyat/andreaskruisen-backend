import { PositionCode } from '../../../generated/prisma/client';
import {
  GoalLeaderRow,
  MatchPenalties,
  MatchWithTeams,
  PlayerSummary,
  TeamSummary,
} from '../types';

export const MATCH_SELECT_FOR_LIST = {
  id: true,
  groupLabel: true,
  round: true,
  playedAt: true,
  penaltyHomeScore: true,
  penaltyAwayScore: true,
  penaltyWinnerTeamId: true,
  homeTeam: { select: { id: true, name: true, crestUrl: true } },
  awayTeam: { select: { id: true, name: true, crestUrl: true } },
  goals: { select: { teamId: true } },
} as const;

// Pênaltis só existem como conjunto completo (os três campos preenchidos
// juntos, ver MatchesRepository.replaceMatchGoals) — nunca parcial.
export const toPenalties = (match: {
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  penaltyWinnerTeamId: string | null;
}): MatchPenalties | null => {
  if (
    match.penaltyHomeScore === null ||
    match.penaltyAwayScore === null ||
    match.penaltyWinnerTeamId === null
  ) {
    return null;
  }
  return {
    homeScore: match.penaltyHomeScore,
    awayScore: match.penaltyAwayScore,
    winnerTeamId: match.penaltyWinnerTeamId,
  };
};

export const toMatchWithTeams = (match: {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  penaltyWinnerTeamId: string | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  goals: { teamId: string }[];
}): MatchWithTeams => ({
  id: match.id,
  groupLabel: match.groupLabel,
  round: match.round,
  playedAt: match.playedAt,
  penalties: toPenalties(match),
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  goalScorerTeamIds: match.goals.map((goal) => goal.teamId),
});

// Sem teamId: usado quando o time vem de outra fonte (PlayerTeamAssignment
// da temporada), não do Player — ver MatchesRepository.findPlayersByTeamIds.
export const PLAYER_SELECT_FOR_SUMMARY = {
  id: true,
  name: true,
  photoUrl: true,
  positions: { select: { position: true, isPrimary: true } },
} as const;

export const PLAYER_SUMMARY_SELECT = {
  ...PLAYER_SELECT_FOR_SUMMARY,
  teamId: true,
} as const;

export const toPlayerSummary = (player: {
  id: string;
  name: string;
  photoUrl: string;
  teamId: string;
  positions: { position: PositionCode; isPrimary: boolean }[];
}): PlayerSummary => {
  const primary =
    player.positions.find((position) => position.isPrimary) ??
    player.positions[0];

  return {
    id: player.id,
    name: player.name,
    photoUrl: player.photoUrl,
    teamId: player.teamId,
    position: primary?.position ?? 'ATA',
  };
};

// Linhas vêm de um groupBy(['scorerId'|'assistId', 'teamId']) já ordenado
// por contagem desc: a primeira linha de cada jogador é o seu time com mais
// gols/assistências no torneio, por isso vira o time exibido no ranking.
export const aggregateGoalLeaderRows = (
  rows: GoalLeaderRow[],
  limit: number,
): GoalLeaderRow[] => {
  const byPlayer = new Map<string, GoalLeaderRow>();

  for (const row of rows) {
    const existing = byPlayer.get(row.playerId);
    if (existing) {
      existing.count += row.count;
    } else {
      byPlayer.set(row.playerId, { ...row });
    }
  }

  return [...byPlayer.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};
