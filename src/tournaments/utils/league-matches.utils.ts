import { GeneratedGroupMatch } from '../types';

const roundRobinPairings = (teamsCount: number): [number, number][][] => {
  const positions = Array.from({ length: teamsCount }, (_, i) => i);
  const half = teamsCount / 2;
  const rounds: [number, number][][] = [];

  for (let round = 0; round < teamsCount - 1; round++) {
    const pairings: [number, number][] = [];

    for (let i = 0; i < half; i++)
      pairings.push([positions[i], positions[teamsCount - 1 - i]]);

    rounds.push(pairings);

    const last = positions[teamsCount - 1];

    for (let i = teamsCount - 1; i > 1; i--) positions[i] = positions[i - 1];

    positions[1] = last;
  }

  return rounds;
};

const roundRobinMatches = (
  teamIds: string[],
  groupLabel: string,
): GeneratedGroupMatch[] => {
  const matches: GeneratedGroupMatch[] = [];

  roundRobinPairings(teamIds.length).forEach((pairings, roundIndex) => {
    for (const [home, away] of pairings) {
      matches.push({
        groupLabel,
        round: roundIndex + 1,
        homeTeamId: teamIds[home],
        awayTeamId: teamIds[away],
      });
    }
  });

  return matches;
};

export const generateLeagueMatches = (
  teamIds: string[],
): GeneratedGroupMatch[] => roundRobinMatches(teamIds, 'A');
