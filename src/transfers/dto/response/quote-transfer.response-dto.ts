export type QuoteTransferResponseDTO = {
  cost: number;
  balance: number;
  sufficientBalance: boolean;
  outgoingPlayerOverall: number;
  incomingPlayerOverall: number;
  couponBalance: number;
  useCoupon: boolean;
  // Janela de negociação aberta com taxa ligada (ver NegotiationWindow) —
  // front usa isso pra avisar que o custo inclui a faixa progressiva.
  feeEnabled: boolean;
};
