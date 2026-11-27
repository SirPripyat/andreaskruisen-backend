export type QuoteTransferResponseDTO = {
  cost: number;
  balance: number;
  sufficientBalance: boolean;
  // Soma dos overalls de cada lado — 1 jogador no caso comum, até 2 numa
  // troca multi-jogador (ver v1-transferencias.md).
  outgoingOverallSum: number;
  incomingOverallSum: number;
  couponBalance: number;
  useCoupon: boolean;
  // Janela de negociação aberta com taxa ligada (ver NegotiationWindow) —
  // front usa isso pra avisar que o custo inclui a faixa progressiva.
  feeEnabled: boolean;
};
