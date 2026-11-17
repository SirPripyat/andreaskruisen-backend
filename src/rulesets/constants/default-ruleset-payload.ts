import { RulesetPayload } from '../schemas/ruleset-payload.schema';

// Valores definidos pelo grupo pro v1 (ver CLAUDE.md, "pontos em aberto" —
// agora resolvido). Usado só pra semear a version 1 do ruleset de cada
// season (ver SeedDefaultRulesetUseCase); depois de criado, o ruleset é
// que manda, não essa constante.
export const DEFAULT_RULESET_PAYLOAD: RulesetPayload = {
  prizes: {
    matchResult: { win: 15, draw: 12, loss: 9 },
    groupPositionAmounts: [15, 12, 9, 7, 5, 3, 1],
    phaseAdvance: 10,
    champion: 20,
    runnerUp: 10,
  },
  transferPricing: {
    coinsPerOverallPoint: 10,
    progressiveFeeBands: [
      { maxOverallDiff: 2, fee: 10 },
      { maxOverallDiff: 5, fee: 20 },
      { maxOverallDiff: 8, fee: 30 },
      { maxOverallDiff: null, fee: 50 },
    ],
  },
  initialBalance: {
    baseOverall: 79,
  },
  coupon: {
    cap: 4,
  },
};
