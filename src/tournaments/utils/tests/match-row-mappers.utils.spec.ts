import { aggregateGoalLeaderRows } from '../match-row-mappers.utils';

describe('aggregateGoalLeaderRows', () => {
  it('soma a contagem de um mesmo jogador em times diferentes (trocado no meio do torneio)', () => {
    const result = aggregateGoalLeaderRows(
      [
        { playerId: 'bellingham', teamId: 'real-madrid', count: 5 },
        { playerId: 'bellingham', teamId: 'barcelona', count: 2 },
      ],
      10,
    );

    expect(result).toEqual([
      { playerId: 'bellingham', teamId: 'real-madrid', count: 7 },
    ]);
  });

  it('exibe o time com mais gols/assistências do jogador, não o primeiro que aparecer por acaso', () => {
    const result = aggregateGoalLeaderRows(
      [
        { playerId: 'bellingham', teamId: 'barcelona', count: 6 },
        { playerId: 'bellingham', teamId: 'real-madrid', count: 1 },
      ],
      10,
    );

    expect(result).toEqual([
      { playerId: 'bellingham', teamId: 'barcelona', count: 7 },
    ]);
  });

  it('ordena por contagem total desc e respeita o limit', () => {
    const result = aggregateGoalLeaderRows(
      [
        { playerId: 'mbappe', teamId: 'real-madrid', count: 8 },
        { playerId: 'bellingham', teamId: 'real-madrid', count: 5 },
        { playerId: 'bellingham', teamId: 'barcelona', count: 2 },
        { playerId: 'vinicius', teamId: 'real-madrid', count: 3 },
      ],
      2,
    );

    expect(result).toEqual([
      { playerId: 'mbappe', teamId: 'real-madrid', count: 8 },
      { playerId: 'bellingham', teamId: 'real-madrid', count: 7 },
    ]);
  });
});
