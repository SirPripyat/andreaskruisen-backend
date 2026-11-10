import { TeamSummary } from '../../tournaments/types';

// Uma partida já jogada de um time, do ponto de vista dele (gols pró/contra
// já resolvidos pra esse lado, não homeGoals/awayGoals) — ver
// TeamsRepository.findPlayedMatchesForTeam.
export type TeamMatchResult = {
  matchId: string;
  playedAt: Date;
  seasonId: string;
  opponent: TeamSummary;
  goalsFor: number;
  goalsAgainst: number;
};

export type MatchOutcome = 'V' | 'E' | 'D';

export const matchOutcome = (
  goalsFor: number,
  goalsAgainst: number,
): MatchOutcome => {
  if (goalsFor > goalsAgainst) {
    return 'V';
  }
  if (goalsFor < goalsAgainst) {
    return 'D';
  }
  return 'E';
};

const POINTS_BY_OUTCOME: Record<MatchOutcome, number> = { V: 3, E: 1, D: 0 };

export type SeasonCampaign = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  // 0 a 100: pontos conquistados sobre o máximo possível (games * 3).
  pointsPercentage: number;
};

export const computeSeasonCampaign = (
  matches: TeamMatchResult[],
  seasonId: string,
): SeasonCampaign => {
  const seasonMatches = matches.filter((match) => match.seasonId === seasonId);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of seasonMatches) {
    switch (matchOutcome(match.goalsFor, match.goalsAgainst)) {
      case 'V':
        wins++;
        break;
      case 'E':
        draws++;
        break;
      case 'D':
        losses++;
        break;
    }
    goalsFor += match.goalsFor;
    goalsAgainst += match.goalsAgainst;
  }

  const games = seasonMatches.length;
  const points = wins * POINTS_BY_OUTCOME.V + draws * POINTS_BY_OUTCOME.E;

  return {
    games,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points,
    pointsPercentage: games > 0 ? (points / (games * 3)) * 100 : 0,
  };
};

export type RecentMatchResult = {
  matchId: string;
  playedAt: Date;
  opponent: TeamSummary;
  goalsFor: number;
  goalsAgainst: number;
  result: MatchOutcome;
};

// `matches` já vem ordenado do mais recente pro mais antigo (ver
// findPlayedMatchesForTeam), então só corta os `limit` primeiros.
export const toRecentMatches = (
  matches: TeamMatchResult[],
  limit: number,
): RecentMatchResult[] =>
  matches.slice(0, limit).map((match) => ({
    matchId: match.matchId,
    playedAt: match.playedAt,
    opponent: match.opponent,
    goalsFor: match.goalsFor,
    goalsAgainst: match.goalsAgainst,
    result: matchOutcome(match.goalsFor, match.goalsAgainst),
  }));

export type HeadToHeadRecord = {
  opponent: TeamSummary;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

export type HeadToHead = {
  // Maior freguês: contra quem o time mais venceu.
  biggestVictim: HeadToHeadRecord | null;
  // Maior carrasco: quem mais venceu o time.
  biggestTormentor: HeadToHeadRecord | null;
};

export const computeHeadToHead = (matches: TeamMatchResult[]): HeadToHead => {
  const byOpponent = new Map<string, HeadToHeadRecord>();

  for (const match of matches) {
    const record = byOpponent.get(match.opponent.id) ?? {
      opponent: match.opponent,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };

    record.games++;
    switch (matchOutcome(match.goalsFor, match.goalsAgainst)) {
      case 'V':
        record.wins++;
        break;
      case 'E':
        record.draws++;
        break;
      case 'D':
        record.losses++;
        break;
    }

    byOpponent.set(match.opponent.id, record);
  }

  const records = [...byOpponent.values()];

  const [biggestVictim] = records
    .filter((record) => record.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.games - a.games);

  const [biggestTormentor] = records
    .filter((record) => record.losses > 0)
    .sort((a, b) => b.losses - a.losses || b.games - a.games);

  return {
    biggestVictim: biggestVictim ?? null,
    biggestTormentor: biggestTormentor ?? null,
  };
};
