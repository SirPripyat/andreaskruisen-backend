import {
  calculateTraditionalMarketTransferCost,
  TransferPricingConfig,
} from '../transfer-pricing.utils';

const PRICING: TransferPricingConfig = {
  coinsPerOverallPoint: 10,
  progressiveFeeBands: [
    { maxOverallDiff: 2, fee: 10 },
    { maxOverallDiff: 5, fee: 20 },
    { maxOverallDiff: 8, fee: 30 },
    { maxOverallDiff: null, fee: 50 },
  ],
};

describe('calculateTraditionalMarketTransferCost', () => {
  it.each([
    [85, 86, 20],
    [85, 87, 30],
    [85, 88, 50],
    [85, 90, 70],
    [85, 91, 90],
    [85, 93, 110],
    [75, 90, 200],
    [90, 88, 10],
    [85, 85, 10],
  ])(
    'sem cupom, %i -> %i custa %i moedas',
    (outgoingOverallSum, incomingOverallSum, expectedCost) => {
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingOverallSum,
            incomingOverallSum,
            useCoupon: false,
            feeEnabled: true,
          },
          PRICING,
        ),
      ).toBe(expectedCost);
    },
  );

  it.each([
    [85, 88, 30],
    [75, 90, 150],
    [90, 88, 0],
  ])(
    'com cupom, %i -> %i custa %i moedas',
    (outgoingOverallSum, incomingOverallSum, expectedCost) => {
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingOverallSum,
            incomingOverallSum,
            useCoupon: true,
            feeEnabled: true,
          },
          PRICING,
        ),
      ).toBe(expectedCost);
    },
  );

  it.each([
    [85, 88, 30],
    [75, 90, 150],
    [90, 88, 0],
  ])(
    'com a janela sem taxa (feeEnabled: false), %i -> %i custa %i moedas (só a diferença)',
    (outgoingOverallSum, incomingOverallSum, expectedCost) => {
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingOverallSum,
            incomingOverallSum,
            useCoupon: false,
            feeEnabled: false,
          },
          PRICING,
        ),
      ).toBe(expectedCost);
    },
  );

  // Troca multi-jogador (ver v1-transferencias.md): a fórmula não muda,
  // só os overalls de entrada são somados antes de calcular a diferença.
  describe('troca multi-jogador', () => {
    it('2 jogadores saem por 1 que entra: soma dos dois lados define a diferença', () => {
      // sai 70 + 75 (soma 145), entra 90 -> diferença negativa -> só taxa mínima
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingOverallSum: 70 + 75,
            incomingOverallSum: 90,
            useCoupon: false,
            feeEnabled: true,
          },
          PRICING,
        ),
      ).toBe(10);
    });

    it('1 jogador sai por 2 que entram: soma dos dois lados define a diferença', () => {
      // sai 80, entra 50 + 55 (soma 105) -> diferença 25 -> faixa sem teto (50)
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingOverallSum: 80,
            incomingOverallSum: 50 + 55,
            useCoupon: false,
            feeEnabled: true,
          },
          PRICING,
        ),
      ).toBe(25 * 10 + 50);
    });
  });
});
