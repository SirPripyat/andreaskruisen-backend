// Teto de acúmulo de cupons de isenção de taxa por squad (ver
// docs/regras-temporada/v1-transferencias.md, seção 3) — vem do ruleset
// da season (ver src/rulesets). Sem validade — só não acumula além do cap.
// Um cupom concedido quando o squad já está no teto é simplesmente perdido
// (o saldo não sobe além do cap), por isso quem concede precisa checar
// antes de gravar a transação GRANTED no ledger.
export const canGrantCoupon = (
  currentCouponBalance: number,
  cap: number,
): boolean => currentCouponBalance < cap;
