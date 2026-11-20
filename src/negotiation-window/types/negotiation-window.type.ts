// Visão mínima usada como guard por transfers/negotiations (ver
// GetOpenNegotiationWindowUseCase) — só o que elas precisam pra decidir
// se a operação é permitida e se a faixa de taxa deve ser cobrada.
export type OpenNegotiationWindow = {
  id: string;
  feeEnabled: boolean;
};
