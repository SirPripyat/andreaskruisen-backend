import {
  matchResultRewardByTeam,
  rankingReward,
  resolvePrizeDelta,
} from '../tournament-prizes.utils';

const GROUP_POSITION_AMOUNTS = [15, 12, 9, 7, 5, 3, 1];
const MATCH_RESULT_REWARDS = { win: 15, draw: 12, loss: 9 };

describe('rankingReward', () => {
  it.each([
    [1, 15],
    [2, 12],
    [3, 9],
    [4, 7],
    [5, 5],
    [6, 3],
    [7, 1],
    [8, 1],
    [9, 1],
    [20, 1],
  ])('posição %i vale %i moedas', (position, expected) => {
    expect(rankingReward(position, GROUP_POSITION_AMOUNTS)).toBe(expected);
  });
});

describe('matchResultRewardByTeam', () => {
  it('vencedor recebe WIN e perdedor recebe LOSS', () => {
    expect(
      matchResultRewardByTeam(
        {
          homeTeamId: 't1',
          awayTeamId: 't2',
          homeGoals: 2,
          awayGoals: 1,
          penaltyWinnerTeamId: null,
        },
        MATCH_RESULT_REWARDS,
      ),
    ).toEqual({
      t1: { type: 'WIN', amount: 15 },
      t2: { type: 'LOSS', amount: 9 },
    });
  });

  it('placar igual sem pênaltis: os dois recebem DRAW', () => {
    expect(
      matchResultRewardByTeam(
        {
          homeTeamId: 't1',
          awayTeamId: 't2',
          homeGoals: 1,
          awayGoals: 1,
          penaltyWinnerTeamId: null,
        },
        MATCH_RESULT_REWARDS,
      ),
    ).toEqual({
      t1: { type: 'DRAW', amount: 12 },
      t2: { type: 'DRAW', amount: 12 },
    });
  });

  it('placar igual com pênaltis (mata-mata): WIN/LOSS, sem DRAW', () => {
    expect(
      matchResultRewardByTeam(
        {
          homeTeamId: 't1',
          awayTeamId: 't2',
          homeGoals: 1,
          awayGoals: 1,
          penaltyWinnerTeamId: 't2',
        },
        MATCH_RESULT_REWARDS,
      ),
    ).toEqual({
      t2: { type: 'WIN', amount: 15 },
      t1: { type: 'LOSS', amount: 9 },
    });
  });
});

describe('resolvePrizeDelta', () => {
  it('nada lançado ainda: devolve o valor cheio', () => {
    expect(resolvePrizeDelta(0, 15)).toBe(15);
  });

  it('já lançado e valor não mudou: devolve 0 (não lança nada)', () => {
    expect(resolvePrizeDelta(15, 15)).toBe(0);
  });

  it('já lançado e valor mudou pra mais: devolve a diferença positiva', () => {
    expect(resolvePrizeDelta(9, 15)).toBe(6);
  });

  it('já lançado e valor mudou pra menos: devolve a diferença negativa', () => {
    expect(resolvePrizeDelta(15, 9)).toBe(-6);
  });
});
