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
    (outgoingPlayerOverall, incomingPlayerOverall, expectedCost) => {
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingPlayerOverall,
            incomingPlayerOverall,
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
    (outgoingPlayerOverall, incomingPlayerOverall, expectedCost) => {
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingPlayerOverall,
            incomingPlayerOverall,
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
    (outgoingPlayerOverall, incomingPlayerOverall, expectedCost) => {
      expect(
        calculateTraditionalMarketTransferCost(
          {
            outgoingPlayerOverall,
            incomingPlayerOverall,
            useCoupon: false,
            feeEnabled: false,
          },
          PRICING,
        ),
      ).toBe(expectedCost);
    },
  );
});
