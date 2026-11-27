import {
  buildFirstPhase,
  knockoutRoundName,
} from '../generate-tournament-phase.utils';

describe('knockoutRoundName', () => {
  it.each([
    [2, 'Final'],
    [4, 'Semifinal'],
    [8, 'Quartas de final'],
    [16, 'Oitavas de final'],
  ])(
    'nomeia a rodada de %i times como "%s", independente do order',
    (teamsCount, name) => {
      expect(knockoutRoundName(teamsCount, 1)).toBe(name);
      expect(knockoutRoundName(teamsCount, 3)).toBe(name);
    },
  );

  it.each([32, 64])(
    'numera pelo order quando a rodada de %i times não tem nome próprio',
    (teamsCount) => {
      expect(knockoutRoundName(teamsCount, 1)).toBe('1ª rodada');
      expect(knockoutRoundName(teamsCount, 2)).toBe('2ª rodada');
    },
  );
});

describe('buildFirstPhase', () => {
  it('gera a fase de grupos usando groupSize/doubleRound/keepOwnedTeamsInSameGroup do groupStage', () => {
    const teamIds = Array.from({ length: 8 }, (_, i) => `t${i}`);

    const phase = buildFirstPhase('GROUP_STAGE_KNOCKOUT', teamIds, {
      config: {
        groupSize: 4,
        qualifiersPerGroup: 2,
        doubleRound: true,
        keepOwnedTeamsInSameGroup: false,
      },
      ownedTeamIds: new Set(['t0', 't1']),
    });

    expect(phase.type).toBe('GROUP');
    expect(phase.matches).toHaveLength(24); // 2 grupos * 6 jogos * 2 turnos
    expect(new Set(phase.matches.map((match) => match.groupLabel))).toEqual(
      new Set(['A', 'B']),
    );
  });

  it('explode sem groupStage pra GROUP_STAGE_KNOCKOUT', () => {
    expect(() =>
      buildFirstPhase('GROUP_STAGE_KNOCKOUT', ['t1', 't2', 't3', 't4']),
    ).toThrow();
  });
});
