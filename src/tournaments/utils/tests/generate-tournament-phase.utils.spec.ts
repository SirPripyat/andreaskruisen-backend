import { knockoutRoundName } from '../generate-tournament-phase.utils';

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
