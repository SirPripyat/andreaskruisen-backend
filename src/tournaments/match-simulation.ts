import { PositionCode } from '../../generated/prisma/client';

export interface SimulationPlayer {
  id: string;
  position: PositionCode;
  overallRating: number;
}

export interface SimulatedGoal {
  scorerId: string;
  assistId: string | null;
}

export interface SimulatedMatchResult {
  homeGoals: SimulatedGoal[];
  awayGoals: SimulatedGoal[];
}

export interface SimulatedPenaltyShootout {
  homeScore: number;
  awayScore: number;
  // true = o time de casa venceu os pênaltis.
  homeWon: boolean;
}

// Média de gols por time numa partida "equilibrada"; o lambda de cada time
// sobe ou desce proporcionalmente à força relativa dos elencos.
const BASE_LAMBDA = 1.4;
const MAX_GOALS_PER_TEAM = 10;
const ASSIST_CHANCE = 0.65;

// Taxa de conversão de cada cobrança de pênalti — não depende da força do
// elenco (ao contrário dos gols em jogo): é um duelo individual só entre
// cobrador e goleiro.
const PENALTY_KICK_SUCCESS_RATE = 0.75;
const PENALTY_SHOOTOUT_ROUNDS = 5;

type PositionTier = 'ATTACK' | 'MIDFIELD' | 'DEFENSE' | 'GK';

const POSITION_TIER: Record<PositionCode, PositionTier> = {
  ATA: 'ATTACK',
  PD: 'ATTACK',
  PE: 'ATTACK',
  MEI: 'MIDFIELD',
  MC: 'MIDFIELD',
  MD: 'MIDFIELD',
  ME: 'MIDFIELD',
  VOL: 'MIDFIELD',
  ZAG: 'DEFENSE',
  LD: 'DEFENSE',
  LE: 'DEFENSE',
  GOL: 'GK',
};

// Goleiro praticamente não marca nem dá assistência; atacante marca mais do
// que assiste, meio-campista é o contrário.
const SCORER_TIER_WEIGHT: Record<PositionTier, number> = {
  ATTACK: 5,
  MIDFIELD: 2,
  DEFENSE: 1,
  GK: 0,
};
const ASSIST_TIER_WEIGHT: Record<PositionTier, number> = {
  ATTACK: 2,
  MIDFIELD: 4,
  DEFENSE: 1,
  GK: 0,
};

// Diferença de força dos elencos (overall médio) vira lambda de cada time —
// o mais forte tende a marcar mais, mas a soma dos dois lambdas não muda.
export function computeExpectedGoals(
  homeOverall: number,
  awayOverall: number,
): { homeLambda: number; awayLambda: number } {
  const averageOverall = (homeOverall + awayOverall) / 2;
  if (averageOverall === 0) {
    return { homeLambda: BASE_LAMBDA, awayLambda: BASE_LAMBDA };
  }

  return {
    homeLambda: BASE_LAMBDA * (homeOverall / averageOverall),
    awayLambda: BASE_LAMBDA * (awayOverall / averageOverall),
  };
}

// Algoritmo de Knuth: consome rng() até o produto acumulado cair abaixo de
// e^-lambda. Número de chamadas varia (é assim que a distribuição funciona).
export function samplePoisson(lambda: number, rng: () => number): number {
  const threshold = Math.exp(-lambda);
  let count = 0;
  let product = 1;
  do {
    count++;
    product *= rng();
  } while (product > threshold);
  return count - 1;
}

function averageOverall(roster: SimulationPlayer[]): number {
  if (roster.length === 0) return 0;
  return (
    roster.reduce((sum, player) => sum + player.overallRating, 0) /
    roster.length
  );
}

export function pickWeightedPlayer(
  players: SimulationPlayer[],
  weightTable: Record<PositionTier, number>,
  rng: () => number,
): SimulationPlayer {
  const weights = players.map(
    (player) => weightTable[POSITION_TIER[player.position]],
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total === 0) {
    return players[Math.floor(rng() * players.length)];
  }

  let threshold = rng() * total;
  for (let i = 0; i < players.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return players[i];
  }
  // Só cai aqui por imprecisão de ponto flutuante no último passo.
  return players[players.length - 1];
}

function generateTeamGoals(
  roster: SimulationPlayer[],
  goalsCount: number,
  rng: () => number,
): SimulatedGoal[] {
  if (roster.length === 0) return [];

  const goals: SimulatedGoal[] = [];
  for (let i = 0; i < goalsCount; i++) {
    const scorer = pickWeightedPlayer(roster, SCORER_TIER_WEIGHT, rng);
    const assistCandidates = roster.filter((p) => p.id !== scorer.id);

    const assist =
      assistCandidates.length > 0 && rng() < ASSIST_CHANCE
        ? pickWeightedPlayer(assistCandidates, ASSIST_TIER_WEIGHT, rng)
        : null;

    goals.push({ scorerId: scorer.id, assistId: assist?.id ?? null });
  }
  return goals;
}

export function simulateMatch(
  homeRoster: SimulationPlayer[],
  awayRoster: SimulationPlayer[],
  rng: () => number = Math.random,
): SimulatedMatchResult {
  const { homeLambda, awayLambda } = computeExpectedGoals(
    averageOverall(homeRoster),
    averageOverall(awayRoster),
  );

  const homeGoalsCount = Math.min(
    samplePoisson(homeLambda, rng),
    MAX_GOALS_PER_TEAM,
  );
  const awayGoalsCount = Math.min(
    samplePoisson(awayLambda, rng),
    MAX_GOALS_PER_TEAM,
  );

  return {
    homeGoals: generateTeamGoals(homeRoster, homeGoalsCount, rng),
    awayGoals: generateTeamGoals(awayRoster, awayGoalsCount, rng),
  };
}

// Disputa de pênaltis pra desempatar uma eliminatória (ver
// TournamentsService.simulateMatch) — 5 cobranças alternadas por time e,
// se continuar empatado, morte súbita (1 cobrança por vez) até alguém
// marcar e o outro não na mesma rodada. Não depende do elenco: é sempre o
// mesmo duelo individual cobrador x goleiro (ver PENALTY_KICK_SUCCESS_RATE).
export function simulatePenaltyShootout(
  rng: () => number = Math.random,
): SimulatedPenaltyShootout {
  let homeScore = 0;
  let awayScore = 0;

  for (let round = 0; round < PENALTY_SHOOTOUT_ROUNDS; round++) {
    if (rng() < PENALTY_KICK_SUCCESS_RATE) homeScore++;
    if (rng() < PENALTY_KICK_SUCCESS_RATE) awayScore++;
  }

  while (homeScore === awayScore) {
    const homeScored = rng() < PENALTY_KICK_SUCCESS_RATE;
    const awayScored = rng() < PENALTY_KICK_SUCCESS_RATE;
    if (homeScored) homeScore++;
    if (awayScored) awayScore++;
  }

  return { homeScore, awayScore, homeWon: homeScore > awayScore };
}
