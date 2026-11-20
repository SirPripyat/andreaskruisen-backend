import {
  ProgressiveFeeBand,
  progressiveFee,
} from '../../transfers/utils/transfer-pricing.utils';

export type DirectNegotiationFeeInput = {
  proposingSquadId: string;
  targetSquadId: string;
  // Overall do jogador que sai do proposingSquad.
  outgoingPlayerOverall: number;
  // Overall do jogador que sai do targetSquad (entra no proposingSquad).
  incomingPlayerOverall: number;
};

export type DirectNegotiationFee = {
  squadId: string;
  amount: number;
};

// Taxa de negociação (ver NegotiationWindow): só se aplica numa troca de
// jogadores (os dois lados preenchidos) quando a janela aberta tem
// feeEnabled = true — ver AcceptNegotiationUseCase. Reaproveita a mesma
// faixa progressiva do mercado tradicional (transferPricing do ruleset
// vigente), cobrada do squad que fica com o jogador de maior overall —
// espelha calculateTraditionalMarketTransferCost, onde quem recebe o
// jogador melhor é quem paga.
export const calculateDirectNegotiationFee = (
  input: DirectNegotiationFeeInput,
  progressiveFeeBands: ProgressiveFeeBand[],
): DirectNegotiationFee => {
  const diff = input.incomingPlayerOverall - input.outgoingPlayerOverall;
  const squadId = diff > 0 ? input.proposingSquadId : input.targetSquadId;

  return {
    squadId,
    amount: progressiveFee(Math.abs(diff), progressiveFeeBands),
  };
};
