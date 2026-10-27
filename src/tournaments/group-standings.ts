export interface GroupStandingTeam {
  id: string;
  name: string;
}

export interface GroupStandingMatch {
  homeTeamId: string;
  awayTeamId: string;
  // null = partida ainda não jogada (ver Match.playedAt e Goal).
  result: { homeGoals: number; awayGoals: number } | null;
}

export interface GroupStanding {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  winPercentage: number;
  // Resultados mais recentes primeiro (assume que `matches` chega em ordem
  // cronológica); só considera partidas já disputadas.
  last5: ('W' | 'D' | 'L')[];
}

const LAST_N_MATCHES = 5;
const POINTS_PER_WIN = 3;
const POINTS_PER_DRAW = 1;

interface Accumulator {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  results: ('W' | 'D' | 'L')[];
}

export function computeGroupStandings(
  teams: GroupStandingTeam[],
  matches: GroupStandingMatch[],
): GroupStanding[] {
  const accumulators = new Map<string, Accumulator>(
    teams.map((team) => [
      team.id,
      {
        teamId: team.id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        results: [],
      },
    ]),
  );

  for (const match of matches) {
    if (!match.result) continue;

    const home = accumulators.get(match.homeTeamId);
    const away = accumulators.get(match.awayTeamId);
    if (!home || !away) continue;

    applyResult(home, away, match.result);
  }

  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  const standings = [...accumulators.values()].map((acc) => {
    const goalDifference = acc.goalsFor - acc.goalsAgainst;
    return {
      teamId: acc.teamId,
      teamName: teamNameById.get(acc.teamId) ?? '',
      played: acc.played,
      wins: acc.wins,
      draws: acc.draws,
      losses: acc.losses,
      goalsFor: acc.goalsFor,
      goalsAgainst: acc.goalsAgainst,
      goalDifference,
      points: acc.points,
      winPercentage:
        acc.played > 0
          ? Math.round((acc.points / (acc.played * POINTS_PER_WIN)) * 1000) / 10
          : 0,
      last5: acc.results.slice(-LAST_N_MATCHES).reverse(),
    };
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return standings.map((standing, index) => ({
    ...standing,
    position: index + 1,
  }));
}

function applyResult(
  home: Accumulator,
  away: Accumulator,
  result: { homeGoals: number; awayGoals: number },
): void {
  const { homeGoals, awayGoals } = result;

  home.played++;
  away.played++;
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) {
    home.wins++;
    away.losses++;
    home.points += POINTS_PER_WIN;
    home.results.push('W');
    away.results.push('L');
  } else if (homeGoals < awayGoals) {
    away.wins++;
    home.losses++;
    away.points += POINTS_PER_WIN;
    home.results.push('L');
    away.results.push('W');
  } else {
    home.draws++;
    away.draws++;
    home.points += POINTS_PER_DRAW;
    away.points += POINTS_PER_DRAW;
    home.results.push('D');
    away.results.push('D');
  }
}
