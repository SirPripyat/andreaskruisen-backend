import { canGrantCoupon } from '../transfer-coupon.utils';

const CAP = 4;

describe('canGrantCoupon', () => {
  it.each([0, 1, 2, 3])(
    'permite conceder quando o saldo é %i (abaixo do teto)',
    (currentCouponBalance) => {
      expect(canGrantCoupon(currentCouponBalance, CAP)).toBe(true);
    },
  );

  it.each([4, 5])(
    'bloqueia a concessão quando o saldo é %i (no teto ou acima)',
    (currentCouponBalance) => {
      expect(canGrantCoupon(currentCouponBalance, CAP)).toBe(false);
    },
  );
});
