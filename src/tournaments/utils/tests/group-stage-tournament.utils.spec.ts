import { generateGroupStageMatches } from '../group-stage-tournament.utils';

describe('generateGroupStageMatches', () => {
  it('monta o turno único (6 jogos) pra um grupo de 4 times', () => {
    const matches = generateGroupStageMatches([['t1', 't2', 't3', 't4']]);

    expect(matches).toHaveLength(6);
    expect(matches.every((match) => match.groupLabel === 'A')).toBe(true);

    const pairs = matches.map((match) =>
      [match.homeTeamId, match.awayTeamId].sort().join('-'),
    );
    expect(new Set(pairs).size).toBe(6);
  });

  it('distribui as 6 partidas em 3 rodadas, cada time jogando uma vez por rodada', () => {
    const matches = generateGroupStageMatches([['t1', 't2', 't3', 't4']]);

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

  it('rotula os grupos recebidos como A, B, C...', () => {
    const groups = [
      ['t0', 't1', 't2', 't3'],
      ['t4', 't5', 't6', 't7'],
      ['t8', 't9', 't10', 't11'],
    ];
    const matches = generateGroupStageMatches(groups);

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

  it('aceita grupos de tamanho diferente de 4', () => {
    const matches = generateGroupStageMatches([['t1', 't2', 't3']]);

    expect(matches).toHaveLength(3); // turno único de 3 times = 3 jogos
    expect(new Set(matches.map((match) => match.round))).toEqual(
      new Set([1, 2, 3]),
    );
  });

  describe('ida e volta', () => {
    it('dobra o número de partidas, com casa/fora invertidos no 2º turno', () => {
      const matches = generateGroupStageMatches(
        [['t1', 't2', 't3', 't4']],
        true,
      );

      expect(matches).toHaveLength(12);

      const firstLeg = matches.filter((match) => match.round <= 3);
      const secondLeg = matches.filter((match) => match.round > 3);

      expect(firstLeg).toHaveLength(6);
      expect(secondLeg).toHaveLength(6);
      expect(new Set(secondLeg.map((match) => match.round))).toEqual(
        new Set([4, 5, 6]),
      );

      for (const leg1 of firstLeg) {
        const reverse = secondLeg.find(
          (leg2) =>
            leg2.homeTeamId === leg1.awayTeamId &&
            leg2.awayTeamId === leg1.homeTeamId,
        );
        expect(reverse).toBeDefined();
      }
    });
  });
});
