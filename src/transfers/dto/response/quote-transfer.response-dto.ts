export type QuoteTransferResponseDTO = {
  cost: number;
  balance: number;
  sufficientBalance: boolean;
  outgoingPlayerOverall: number;
  incomingPlayerOverall: number;
  couponBalance: number;
  useCoupon: boolean;
};
