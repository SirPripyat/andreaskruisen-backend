import { calculateInitialBalances } from '../initial-balance.utils';

const BASE_OVERALL = 79;

describe('calculateInitialBalances', () => {
  it('dá saldo 0 pro squad com o elenco mais forte e compensa os demais até o teto', () => {
    const result = calculateInitialBalances(
      [
        { squadId: 'barcelona', playerOveralls: [86, 82, 80] }, // (7+3+1)*10 = 110
        { squadId: 'ajax', playerOveralls: [81, 79] }, // 79 não conta (não é > base); (2)*10 = 20
      ],
      BASE_OVERALL,
    );

    expect(result).toEqual([
      { squadId: 'barcelona', initialBalance: 0 },
      { squadId: 'ajax', initialBalance: 90 },
    ]);
  });

  it('dá o teto inteiro pro squad sem nenhum jogador acima da base', () => {
    const result = calculateInitialBalances(
      [
        { squadId: 'forte', playerOveralls: [86, 82, 80] }, // rawCost 110
        { squadId: 'fraco', playerOveralls: [70, 75] }, // rawCost 0
      ],
      BASE_OVERALL,
    );

    expect(result).toEqual([
      { squadId: 'forte', initialBalance: 0 },
      { squadId: 'fraco', initialBalance: 110 },
    ]);
  });

  it('dá saldo 0 pra todos quando nenhum squad tem jogador acima da base', () => {
    const result = calculateInitialBalances(
      [
        { squadId: 'a', playerOveralls: [70, 75] },
        { squadId: 'b', playerOveralls: [79] },
      ],
      BASE_OVERALL,
    );

    expect(result).toEqual([
      { squadId: 'a', initialBalance: 0 },
      { squadId: 'b', initialBalance: 0 },
    ]);
  });

  it('dá saldo 0 quando existe um único squad na temporada', () => {
    const result = calculateInitialBalances(
      [{ squadId: 'unico', playerOveralls: [90, 85] }],
      BASE_OVERALL,
    );

    expect(result).toEqual([{ squadId: 'unico', initialBalance: 0 }]);
  });

  it('retorna lista vazia quando não há squads', () => {
    expect(calculateInitialBalances([], BASE_OVERALL)).toEqual([]);
  });
});
