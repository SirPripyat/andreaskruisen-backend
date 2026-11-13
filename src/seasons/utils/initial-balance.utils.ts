import { calculateTraditionalMarketTransferCost } from '../../transfers/utils/transfer-pricing.utils';

export type SquadOveralls = {
  squadId: string;
  playerOveralls: number[];
};

export type InitialBalance = {
  squadId: string;
  initialBalance: number;
};

// "Custo bruto" do elenco: soma, pra cada jogador acima da base, do mesmo
// cálculo de diferença de overall do mercado tradicional — com cupom, pra
// isolar só a diferença (ver docs/regras-temporada/saldo-inicial.md).
const calculateRawCost = (
  playerOveralls: number[],
  baseOverall: number,
): number =>
  playerOveralls
    .filter((overall) => overall > baseOverall)
    .reduce(
      (total, overall) =>
        total +
        calculateTraditionalMarketTransferCost({
          outgoingPlayerOverall: baseOverall,
          incomingPlayerOverall: overall,
          useCoupon: true,
        }),
      0,
    );

// Equilibra o saldo inicial entre squads com elencos reais desiguais: quem
// tem o rawCost mais alto (elenco mais forte) começa com 0, os demais
// recebem a diferença até o teto.
export const calculateInitialBalances = (
  squads: SquadOveralls[],
  baseOverall: number,
): InitialBalance[] => {
  const rawCosts = squads.map((squad) => ({
    squadId: squad.squadId,
    rawCost: calculateRawCost(squad.playerOveralls, baseOverall),
  }));

  const ceiling = Math.max(0, ...rawCosts.map(({ rawCost }) => rawCost));

  return rawCosts.map(({ squadId, rawCost }) => ({
    squadId,
    initialBalance: ceiling - rawCost,
  }));
};
