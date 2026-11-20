// Valores de prêmio em moedas definidos pelo grupo (ver CLAUDE.md, "pontos
// em aberto") — vêm do ruleset da season (ver src/rulesets), nunca fixos
// aqui. Essas funções são puras: recebem a configuração como parâmetro.

export type MatchResultRewards = {
  win: number;
  draw: number;
  loss: number;
};

// Prêmio por posição final na fase de grupos/liga: amounts[0] é o valor do
// 1º lugar, amounts[1] o do 2º etc. A última posição listada vale pra ela
// e pra todas as piores (ex.: [15,12,9,7,5,3,1] cobre o 7º lugar em diante
// com 1) — nunca negativo contanto que o array não tenha valor negativo.
export const rankingReward = (position: number, amounts: number[]): number => {
  const index = Math.min(position, amounts.length) - 1;
  return amounts[index];
};

export type MatchOutcomeInput = {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  // Null quando o placar não empatou no tempo normal (pênaltis nem
  // rolaram) ou a partida não é de mata-mata.
  penaltyWinnerTeamId: string | null;
};

export type MatchResultPrize = {
  type: 'WIN' | 'DRAW' | 'LOSS';
  amount: number;
};

// Prêmio de resultado (WIN/DRAW/LOSS) de cada lado de uma partida, por
// teamId. Mata-mata não tem empate de verdade — penaltyWinnerTeamId
// decide WIN/LOSS mesmo com o placar igual no tempo normal (ver
// ReplaceMatchGoalsUseCase).
export const matchResultRewardByTeam = (
  input: MatchOutcomeInput,
  rewards: MatchResultRewards,
): Record<string, MatchResultPrize> => {
  if (input.homeGoals === input.awayGoals && !input.penaltyWinnerTeamId) {
    return {
      [input.homeTeamId]: { type: 'DRAW', amount: rewards.draw },
      [input.awayTeamId]: { type: 'DRAW', amount: rewards.draw },
    };
  }

  const winnerTeamId =
    input.homeGoals === input.awayGoals
      ? (input.penaltyWinnerTeamId as string)
      : input.homeGoals > input.awayGoals
        ? input.homeTeamId
        : input.awayTeamId;

  const loserTeamId =
    winnerTeamId === input.homeTeamId ? input.awayTeamId : input.homeTeamId;

  return {
    [winnerTeamId]: { type: 'WIN', amount: rewards.win },
    [loserTeamId]: { type: 'LOSS', amount: rewards.loss },
  };
};

// Reconcilia o que já foi lançado no ledger pra um prêmio (soma das
// transações do mesmo tipo já ligadas a esse matchId/phaseId + squad) com o
// valor correto calculado agora. Nunca edita o lançamento original: se o
// placar for corrigido depois de já ter premiado, isso só soma uma nova
// transação do mesmo tipo com a diferença (o total dos lançamentos é que
// precisa bater com o valor correto, não precisa ser 1 lançamento só — ver
// CoinTransaction.transferId, que pelo mesmo motivo também não é único
// (uma negociação pode gerar mais de um lançamento pro mesmo Transfer).
// Retorna 0 (não lança nada) quando já está correto.
export const resolvePrizeDelta = (
  recordedTotal: number,
  targetAmount: number,
): number => targetAmount - recordedTotal;
