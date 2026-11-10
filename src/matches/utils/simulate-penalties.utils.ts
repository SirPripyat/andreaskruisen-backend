import { SimulatedPenaltyShootout, SimulationPlayer } from '../types';

const PENALTY_SHOOTOUT_ROUNDS = 5;

// Ordem de cobrança: do melhor cobrador (penaltyRating mais alto) pro
// pior — não sorteado. Se a disputa passar da morte súbita além do
// tamanho do elenco, volta pro primeiro da lista.
const sortByPenaltyRating = (roster: SimulationPlayer[]): SimulationPlayer[] =>
  [...roster].sort((a, b) => b.penaltyRating - a.penaltyRating);

const takesPenalty = (
  kickers: SimulationPlayer[],
  kickIndex: number,
  rng: () => number,
): boolean => {
  const kicker = kickers[kickIndex % kickers.length];
  return rng() < kicker.penaltyRating / 100;
};

export const simulatePenaltyShootout = (
  homeRoster: SimulationPlayer[],
  awayRoster: SimulationPlayer[],
  rng: () => number = Math.random,
): SimulatedPenaltyShootout => {
  const homeKickers = sortByPenaltyRating(homeRoster);
  const awayKickers = sortByPenaltyRating(awayRoster);

  let homeScore = 0;
  let awayScore = 0;
  let kickIndex = 0;

  for (; kickIndex < PENALTY_SHOOTOUT_ROUNDS; kickIndex++) {
    if (takesPenalty(homeKickers, kickIndex, rng)) homeScore++;
    if (takesPenalty(awayKickers, kickIndex, rng)) awayScore++;
  }

  while (homeScore === awayScore) {
    const homeScored = takesPenalty(homeKickers, kickIndex, rng);
    const awayScored = takesPenalty(awayKickers, kickIndex, rng);
    if (homeScored) homeScore++;
    if (awayScored) awayScore++;
    kickIndex++;
  }

  return { homeScore, awayScore, homeWon: homeScore > awayScore };
};
