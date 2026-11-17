import { RulesetPayloadSchema } from '../ruleset-payload.schema';

const VALID_PAYLOAD = {
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

describe('RulesetPayloadSchema', () => {
  it('aceita um payload válido', () => {
    expect(RulesetPayloadSchema.safeParse(VALID_PAYLOAD).success).toBe(true);
  });

  it('rejeita matchResult.win negativo', () => {
    const result = RulesetPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      prizes: {
        ...VALID_PAYLOAD.prizes,
        matchResult: { win: -1, draw: 12, loss: 9 },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejeita groupPositionAmounts vazio', () => {
    const result = RulesetPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      prizes: { ...VALID_PAYLOAD.prizes, groupPositionAmounts: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejeita payload sem a seção prizes', () => {
    const { prizes, ...rest } = VALID_PAYLOAD;
    expect(RulesetPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('aceita progressiveFeeBands com maxOverallDiff null (sem teto)', () => {
    const result = RulesetPayloadSchema.safeParse(VALID_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it('rejeita progressiveFeeBands vazio', () => {
    const result = RulesetPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      transferPricing: {
        ...VALID_PAYLOAD.transferPricing,
        progressiveFeeBands: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejeita initialBalance.baseOverall negativo', () => {
    const result = RulesetPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      initialBalance: { baseOverall: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejeita coupon.cap negativo', () => {
    const result = RulesetPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      coupon: { cap: -1 },
    });
    expect(result.success).toBe(false);
  });
});
