import { generateLeagueMatches } from '../league-matches.utils';

describe('generateLeagueMatches', () => {
  it('monta um turno único com todos os times numa tabela só', () => {
    const teamIds = Array.from({ length: 8 }, (_, i) => `t${i}`);
    const matches = generateLeagueMatches(teamIds);

    // Turno único entre 8 times: C(8,2) = 28 jogos, 7 rodadas de 4 jogos.
    expect(matches).toHaveLength(28);
    expect(matches.every((match) => match.groupLabel === 'A')).toBe(true);

    const pairs = matches.map((match) =>
      [match.homeTeamId, match.awayTeamId].sort().join('-'),
    );
    expect(new Set(pairs).size).toBe(28);

    expect(new Set(matches.map((match) => match.round))).toEqual(
      new Set([1, 2, 3, 4, 5, 6, 7]),
    );
    for (let round = 1; round <= 7; round++) {
      const roundMatches = matches.filter((match) => match.round === round);
      expect(roundMatches).toHaveLength(4);

      const teamsInRound = roundMatches.flatMap((match) => [
        match.homeTeamId,
        match.awayTeamId,
      ]);
      expect(new Set(teamsInRound).size).toBe(8);
    }
  });

  it('não divide os times em grupos, mesmo com mais de 4 times', () => {
    const teamIds = Array.from({ length: 12 }, (_, i) => `t${i}`);
    const matches = generateLeagueMatches(teamIds);

    expect(new Set(matches.map((match) => match.groupLabel))).toEqual(
      new Set(['A']),
    );
  });
});
