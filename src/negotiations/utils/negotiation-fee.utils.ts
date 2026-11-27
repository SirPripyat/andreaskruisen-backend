import {
  ProgressiveFeeBand,
  progressiveFee,
} from '../../transfers/utils/transfer-pricing.utils';

export type DirectNegotiationFeeInput = {
  proposingSquadId: string;
  targetSquadId: string;
  // Soma dos overalls dos jogadores que saem do proposingSquad — 1 no caso
  // comum, até 2 numa troca multi-jogador (ver v1-transferencias.md).
  outgoingOverallSum: number;
  // Soma dos overalls dos jogadores que saem do targetSquad (entram no
  // proposingSquad).
  incomingOverallSum: number;
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
  const diff = input.incomingOverallSum - input.outgoingOverallSum;
  const squadId = diff > 0 ? input.proposingSquadId : input.targetSquadId;

  return {
    squadId,
    amount: progressiveFee(Math.abs(diff), progressiveFeeBands),
  };
};
