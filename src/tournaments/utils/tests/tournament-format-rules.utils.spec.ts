import {
  isValidGroupStageSetup,
  isValidMaxTeams,
} from '../tournament-format-rules.utils';

describe('isValidMaxTeams', () => {
  describe('LEAGUE', () => {
    it.each([4, 8, 12, 16, 20, 24])('aceita %i times', (maxTeams) => {
      expect(isValidMaxTeams('LEAGUE', maxTeams)).toBe(true);
    });

    it.each([3, 10, 25])('rejeita %i times', (maxTeams) => {
      expect(isValidMaxTeams('LEAGUE', maxTeams)).toBe(false);
    });
  });

  describe('KNOCKOUT', () => {
    it.each([2, 4, 8, 16, 32, 64])('aceita %i times', (maxTeams) => {
      expect(isValidMaxTeams('KNOCKOUT', maxTeams)).toBe(true);
    });

    it.each([1, 3, 6, 128])('rejeita %i times', (maxTeams) => {
      expect(isValidMaxTeams('KNOCKOUT', maxTeams)).toBe(false);
    });
  });
});

describe('isValidGroupStageSetup', () => {
  it.each([
    [8, { groupSize: 4, qualifiersPerGroup: 2 }],
    [16, { groupSize: 4, qualifiersPerGroup: 2 }],
    [6, { groupSize: 3, qualifiersPerGroup: 1 }],
    [12, { groupSize: 6, qualifiersPerGroup: 1 }],
    [16, { groupSize: 8, qualifiersPerGroup: 4 }],
    // Total de classificados não precisa mais ser potência de 2: o bracket
    // completa com bye (ver buildGroupStageQualifiersBracket).
    [9, { groupSize: 3, qualifiersPerGroup: 1 }],
    [12, { groupSize: 6, qualifiersPerGroup: 3 }],
  ])(
    'aceita %i times com groupSize/qualifiersPerGroup válidos (%o)',
    (maxTeams, config) => {
      expect(isValidGroupStageSetup(maxTeams, config)).toBe(true);
    },
  );

  it('rejeita quando maxTeams não é múltiplo de groupSize', () => {
    expect(
      isValidGroupStageSetup(10, { groupSize: 4, qualifiersPerGroup: 2 }),
    ).toBe(false);
  });

  it('rejeita quando qualifiersPerGroup é maior que groupSize', () => {
    expect(
      isValidGroupStageSetup(8, { groupSize: 4, qualifiersPerGroup: 5 }),
    ).toBe(false);
  });

  it('rejeita quando o total de classificados é menor que 2', () => {
    expect(
      isValidGroupStageSetup(4, { groupSize: 4, qualifiersPerGroup: 1 }),
    ).toBe(false);
  });

  it('rejeita groupSize menor que 2', () => {
    expect(
      isValidGroupStageSetup(8, { groupSize: 1, qualifiersPerGroup: 1 }),
    ).toBe(false);
  });

  it('rejeita qualifiersPerGroup menor que 1', () => {
    expect(
      isValidGroupStageSetup(8, { groupSize: 4, qualifiersPerGroup: 0 }),
    ).toBe(false);
  });
});
