import { calculateTraditionalMarketTransferCost } from '../transfer-pricing.utils';

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
        calculateTraditionalMarketTransferCost({
          outgoingPlayerOverall,
          incomingPlayerOverall,
          useCoupon: false,
        }),
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
        calculateTraditionalMarketTransferCost({
          outgoingPlayerOverall,
          incomingPlayerOverall,
          useCoupon: true,
        }),
      ).toBe(expectedCost);
    },
  );
});
