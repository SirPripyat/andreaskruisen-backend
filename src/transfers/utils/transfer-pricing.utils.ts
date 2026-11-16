// Faixa da taxa progressiva do mercado tradicional (ver
// docs/regras-temporada/v1-transferencias.md, seção 1). maxOverallDiff
// null = sem teto, pega essa taxa pra qualquer diferença maior que todas
// as outras faixas (substitui Infinity, que não é um valor JSON válido —
// isso vem do ruleset da season, ver src/rulesets).
export type ProgressiveFeeBand = {
  maxOverallDiff: number | null;
  fee: number;
};

export type TransferPricingConfig = {
  coinsPerOverallPoint: number;
  // Array.find() pega a primeira faixa cuja diferença de overall cabe no
  // teto — por isso precisa estar ordenado do menor pro maior
  // maxOverallDiff, com a faixa `null` (sem teto) por último.
  progressiveFeeBands: ProgressiveFeeBand[];
};

const progressiveFee = (
  overallDiff: number,
  progressiveFeeBands: ProgressiveFeeBand[],
): number => {
  const band = progressiveFeeBands.find(
    (band) =>
      band.maxOverallDiff === null || overallDiff <= band.maxOverallDiff,
  );

  return band.fee;
};

export type TraditionalMarketTransferPricingInput = {
  outgoingPlayerOverall: number;
  incomingPlayerOverall: number;
  useCoupon: boolean;
};

// Custo = (diferença de overall × coinsPerOverallPoint) + taxa
// progressiva; o cupom zera só a taxa, nunca a diferença. Diferença
// negativa ou nula (jogador que entra não é melhor) ainda paga a taxa
// mínima — toda contratação está sujeita a ela.
export const calculateTraditionalMarketTransferCost = (
  input: TraditionalMarketTransferPricingInput,
  pricing: TransferPricingConfig,
): number => {
  const overallDiff = Math.max(
    0,
    input.incomingPlayerOverall - input.outgoingPlayerOverall,
  );
  const fee = input.useCoupon
    ? 0
    : progressiveFee(overallDiff, pricing.progressiveFeeBands);

  return overallDiff * pricing.coinsPerOverallPoint + fee;
};
