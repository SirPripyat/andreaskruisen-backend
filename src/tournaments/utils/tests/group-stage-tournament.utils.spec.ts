import { generateGroupStageMatches } from '../group-stage-tournament.utils';

describe('generateGroupStageMatches', () => {
  it('monta o turno único (6 jogos) pra um grupo de 4 times', () => {
    const matches = generateGroupStageMatches(['t1', 't2', 't3', 't4']);

    expect(matches).toHaveLength(6);
    expect(matches.every((match) => match.groupLabel === 'A')).toBe(true);

    const pairs = matches.map((match) =>
      [match.homeTeamId, match.awayTeamId].sort().join('-'),
    );
    expect(new Set(pairs).size).toBe(6);
  });

  it('distribui as 6 partidas em 3 rodadas, cada time jogando uma vez por rodada', () => {
    const matches = generateGroupStageMatches(['t1', 't2', 't3', 't4']);

    expect(new Set(matches.map((match) => match.round))).toEqual(
      new Set([1, 2, 3]),
    );

    for (const round of [1, 2, 3]) {
      const roundMatches = matches.filter((match) => match.round === round);
      expect(roundMatches).toHaveLength(2);

      const teamsInRound = roundMatches.flatMap((match) => [
        match.homeTeamId,
        match.awayTeamId,
      ]);
      expect(new Set(teamsInRound).size).toBe(4);
    }
  });

  it('separa em grupos de 4 e rotula A, B, C...', () => {
    const teamIds = Array.from({ length: 12 }, (_, i) => `t${i}`);
    const matches = generateGroupStageMatches(teamIds);

    expect(matches).toHaveLength(18); // 3 grupos * 6 jogos
    expect(new Set(matches.map((match) => match.groupLabel))).toEqual(
      new Set(['A', 'B', 'C']),
    );

    const groupATeams = new Set(
      matches
        .filter((match) => match.groupLabel === 'A')
        .flatMap((match) => [match.homeTeamId, match.awayTeamId]),
    );
    expect(groupATeams).toEqual(new Set(['t0', 't1', 't2', 't3']));
  });
});
