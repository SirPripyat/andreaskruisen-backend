import { generateKnockoutMatches } from '../knockout-tournament.utils';

describe('generateKnockoutMatches', () => {
  it('pareia os times em sequência', () => {
    const matches = generateKnockoutMatches(['t1', 't2', 't3', 't4']);

    expect(matches).toEqual([
      { homeTeamId: 't1', awayTeamId: 't2' },
      { homeTeamId: 't3', awayTeamId: 't4' },
    ]);
  });
});
