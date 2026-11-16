// Teto de acúmulo de cupons de isenção de taxa por squad (ver
// docs/regras-temporada/v1-transferencias.md, seção 3). Sem validade — só
// não acumula além deste valor.
export const COUPON_CAP = 4;

// Um cupom concedido quando o squad já está no teto é simplesmente perdido
// (o saldo não sobe além de 4), por isso quem concede precisa checar antes
// de gravar a transação GRANTED no ledger.
export const canGrantCoupon = (currentCouponBalance: number): boolean =>
  currentCouponBalance < COUPON_CAP;
