import {
  computeExpectedGoals,
  pickWeightedPlayer,
  SimulationPlayer,
  samplePoisson,
  simulateMatch,
} from './match-simulation';

// Gerador determinístico só pros testes — nunca usado em produção (lá é
// Math.random, igual src/commons/shuffle.ts).
function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function queueRng(values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) {
      throw new Error(
        'queueRng esgotado: teste consumiu mais chamadas do que o esperado',
      );
    }
    return values[i++];
  };
}

describe('computeExpectedGoals', () => {
  it('times com a mesma força recebem o mesmo lambda', () => {
    const { homeLambda, awayLambda } = computeExpectedGoals(80, 80);
    expect(homeLambda).toBeCloseTo(awayLambda);
  });

  it('time mais forte recebe lambda maior, mas a soma não muda', () => {
    const base = computeExpectedGoals(80, 80);
    const skewed = computeExpectedGoals(90, 70);

    expect(skewed.homeLambda).toBeGreaterThan(skewed.awayLambda);
    expect(skewed.homeLambda + skewed.awayLambda).toBeCloseTo(
      base.homeLambda + base.awayLambda,
    );
  });
});

describe('samplePoisson', () => {
  it('consome rng até o produto acumulado cair abaixo de e^-lambda', () => {
    // lambda=1 -> threshold = e^-1 ≈ 0.3679. 1*0.5=0.5 (>threshold, continua);
    // 0.5*0.5=0.25 (<=threshold, para). count final = 2 -> resultado 1.
    const rng = queueRng([0.5, 0.5]);
    expect(samplePoisson(1, rng)).toBe(1);
  });

  it('lambda 0 sempre dá 0 gols', () => {
    const rng = queueRng([0.9]);
    expect(samplePoisson(0, rng)).toBe(0);
  });
});

describe('pickWeightedPlayer', () => {
  const players: SimulationPlayer[] = [
    { id: 'atacante', position: 'ATA', overallRating: 80 },
    { id: 'zagueiro', position: 'ZAG', overallRating: 80 },
  ];
  const weights = { ATTACK: 5, MIDFIELD: 2, DEFENSE: 1, GK: 0 } as const;

  it('escolhe o jogador cujo peso acumulado cobre o sorteio', () => {
    // total = 6; rng*6 = 0 -> cai no primeiro (atacante, peso 5)
    expect(pickWeightedPlayer(players, weights, () => 0).id).toBe('atacante');
    // rng*6 = 5.5 -> passa do atacante (peso 5), cai no zagueiro
    expect(pickWeightedPlayer(players, weights, () => 5.5 / 6).id).toBe(
      'zagueiro',
    );
  });

  it('cai pra sorteio uniforme quando todos os pesos são zero', () => {
    const zeroWeights = { ATTACK: 0, MIDFIELD: 0, DEFENSE: 0, GK: 0 } as const;
    expect(pickWeightedPlayer(players, zeroWeights, () => 0).id).toBe(
      'atacante',
    );
    expect(pickWeightedPlayer(players, zeroWeights, () => 0.9).id).toBe(
      'zagueiro',
    );
  });
});

describe('simulateMatch', () => {
  const makeRoster = (overallRating: number): SimulationPlayer[] => [
    { id: `${overallRating}-gol`, position: 'GOL', overallRating },
    { id: `${overallRating}-zag`, position: 'ZAG', overallRating },
    { id: `${overallRating}-mc`, position: 'MC', overallRating },
    { id: `${overallRating}-ata`, position: 'ATA', overallRating },
  ];

  it('nunca escala o goleiro como artilheiro, mesmo em muitas rodadas', () => {
    const homeRoster = makeRoster(85);
    const awayRoster = makeRoster(85);
    const rng = createSeededRng(42);

    for (let i = 0; i < 50; i++) {
      const result = simulateMatch(homeRoster, awayRoster, rng);
      for (const goal of [...result.homeGoals, ...result.awayGoals]) {
        expect(goal.scorerId).not.toContain('gol');
      }
    }
  });

  it('artilheiro nunca é o próprio assistente', () => {
    const homeRoster = makeRoster(85);
    const awayRoster = makeRoster(60);
    const rng = createSeededRng(7);

    for (let i = 0; i < 50; i++) {
      const result = simulateMatch(homeRoster, awayRoster, rng);
      for (const goal of [...result.homeGoals, ...result.awayGoals]) {
        if (goal.assistId) {
          expect(goal.assistId).not.toBe(goal.scorerId);
        }
      }
    }
  });

  it('time sem elenco não marca gol', () => {
    const result = simulateMatch([], makeRoster(80), () => 0.9);
    expect(result.homeGoals).toEqual([]);
  });
});
