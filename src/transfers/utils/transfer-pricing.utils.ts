// Faixas da taxa progressiva do mercado tradicional (ver
// docs/regras-temporada/v1-transferencias.md, seção 1). Array.find() pega a
// primeira faixa cuja diferença de overall cabe no teto — por isso precisa
// estar ordenado do menor pro maior maxOverallDiff.
const PROGRESSIVE_FEE_BANDS: { maxOverallDiff: number; fee: number }[] = [
  { maxOverallDiff: 2, fee: 10 },
  { maxOverallDiff: 5, fee: 20 },
  { maxOverallDiff: 8, fee: 30 },
  { maxOverallDiff: Infinity, fee: 50 },
];

const COINS_PER_OVERALL_POINT = 10;

const progressiveFee = (overallDiff: number): number => {
  const band = PROGRESSIVE_FEE_BANDS.find(
    (band) => overallDiff <= band.maxOverallDiff,
  );

  return band.fee;
};

export type TraditionalMarketTransferPricingInput = {
  outgoingPlayerOverall: number;
  incomingPlayerOverall: number;
  useCoupon: boolean;
};

// Custo = (diferença de overall × 10) + taxa progressiva; o cupom zera só a
// taxa, nunca a diferença. Diferença negativa ou nula (jogador que entra
// não é melhor) ainda paga a taxa mínima — toda contratação está sujeita a ela.
export const calculateTraditionalMarketTransferCost = (
  input: TraditionalMarketTransferPricingInput,
): number => {
  const overallDiff = Math.max(
    0,
    input.incomingPlayerOverall - input.outgoingPlayerOverall,
  );
  const fee = input.useCoupon ? 0 : progressiveFee(overallDiff);

  return overallDiff * COINS_PER_OVERALL_POINT + fee;
};
