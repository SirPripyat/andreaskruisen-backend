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

// Exportada também pra negotiation-fee.utils.ts (taxa de negociação, ver
// NegotiationWindow): reaproveita a mesma faixa progressiva do ruleset em
// vez de duplicar a lógica de banda.
export const progressiveFee = (
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
  // Snapshot de NegotiationWindow.feeEnabled vigente (ver
  // GetOpenNegotiationWindowUseCase) — com a janela sem taxa, só o custo
  // base (diferença × coinsPerOverallPoint) é cobrado.
  feeEnabled: boolean;
};

// Custo = (diferença de overall × coinsPerOverallPoint) + taxa
// progressiva, essa última só cobrada se feeEnabled (decidido na abertura
// da janela de negociação) e sem cupom. Diferença negativa ou nula
// (jogador que entra não é melhor) ainda paga a taxa mínima quando
// feeEnabled — toda contratação está sujeita a ela.
export const calculateTraditionalMarketTransferCost = (
  input: TraditionalMarketTransferPricingInput,
  pricing: TransferPricingConfig,
): number => {
  const overallDiff = Math.max(
    0,
    input.incomingPlayerOverall - input.outgoingPlayerOverall,
  );
  const fee =
    input.feeEnabled && !input.useCoupon
      ? progressiveFee(overallDiff, pricing.progressiveFeeBands)
      : 0;

  return overallDiff * pricing.coinsPerOverallPoint + fee;
};
