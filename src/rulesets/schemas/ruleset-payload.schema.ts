import { z } from 'zod';

// Tabela de prêmios de torneio (ver tournament-prizes.utils.ts).
// groupPositionAmounts: valor por posição final na fase de grupos/liga,
// índice 0 = 1º lugar. A última posição listada vale pra ela e pra todas
// as piores (ex.: [15,12,9,7,5,3,1] cobre o 7º lugar em diante com 1).
const RulesetPrizeTableSchema = z.object({
  matchResult: z.object({
    win: z.number().int().nonnegative(),
    draw: z.number().int().nonnegative(),
    loss: z.number().int().nonnegative(),
  }),
  groupPositionAmounts: z.array(z.number().int().nonnegative()).min(1),
  phaseAdvance: z.number().int().nonnegative(),
  champion: z.number().int().nonnegative(),
  runnerUp: z.number().int().nonnegative(),
});

// Preço da troca no mercado tradicional (ver transfer-pricing.utils.ts):
// custo = diferença de overall × coinsPerOverallPoint + taxa progressiva.
// maxOverallDiff null = sem teto, essa é a taxa pra qualquer diferença
// maior que todas as outras faixas (JSON não tem Infinity — ver
// transfer-pricing.utils.ts pra como isso é lido).
const ProgressiveFeeBandSchema = z.object({
  maxOverallDiff: z.number().int().positive().nullable(),
  fee: z.number().int().nonnegative(),
});

const TransferPricingSchema = z.object({
  coinsPerOverallPoint: z.number().int().nonnegative(),
  progressiveFeeBands: z.array(ProgressiveFeeBandSchema).min(1),
});

// Overall-base pro cálculo do saldo inicial (ver initial-balance.utils.ts).
const InitialBalanceSchema = z.object({
  baseOverall: z.number().int().nonnegative(),
});

// Teto de acúmulo de cupons de isenção de taxa por squad (ver
// transfer-coupon.utils.ts).
const CouponSchema = z.object({
  cap: z.number().int().nonnegative(),
});

export const RulesetPayloadSchema = z.object({
  prizes: RulesetPrizeTableSchema,
  transferPricing: TransferPricingSchema,
  initialBalance: InitialBalanceSchema,
  coupon: CouponSchema,
});

export type RulesetPrizeTable = z.infer<typeof RulesetPrizeTableSchema>;

// Declarado à mão, não via z.infer: nullable() dentro de um z.object()
// gera `maxOverallDiff?: number` no tipo estático dessa versão do zod
// (some o `| null`) mesmo validando null certinho em runtime — só o tipo
// fica errado. Validação continua pelo TransferPricingSchema.
export type RulesetTransferPricing = {
  coinsPerOverallPoint: number;
  progressiveFeeBands: { maxOverallDiff: number | null; fee: number }[];
};

export type RulesetInitialBalance = z.infer<typeof InitialBalanceSchema>;
export type RulesetCoupon = z.infer<typeof CouponSchema>;

export type RulesetPayload = {
  prizes: RulesetPrizeTable;
  transferPricing: RulesetTransferPricing;
  initialBalance: RulesetInitialBalance;
  coupon: RulesetCoupon;
};
