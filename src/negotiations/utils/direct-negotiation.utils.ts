// Cupom de isenção é concedido a quem entrega um jogador na negociação
// (ver docs/regras-temporada/v1-transferencias.md, seção 3): só o lado que
// vende numa negociação unilateral (compra/venda por moedas), os dois
// lados numa troca (com ou sem compensação em moedas).
export const resolveNegotiationCouponRecipients = (negotiation: {
  proposingSquadId: string;
  targetSquadId: string;
  outgoingPlayerId: string | null;
  incomingPlayerId: string | null;
}): string[] => {
  const recipients: string[] = [];

  if (negotiation.outgoingPlayerId)
    recipients.push(negotiation.proposingSquadId);
  if (negotiation.incomingPlayerId) recipients.push(negotiation.targetSquadId);

  return recipients;
};

// coinAmount é pago pelo proposingSquad ao targetSquad (negativo = o
// targetSquad paga o proposingSquad) — ver comentário do campo no
// schema.prisma. Null/0 não gera nenhum lançamento no ledger.
export const resolveNegotiationCoinTransactions = (negotiation: {
  proposingSquadId: string;
  targetSquadId: string;
  coinAmount: number | null;
}): Array<{ squadId: string; amount: number }> => {
  if (!negotiation.coinAmount) return [];

  return [
    { squadId: negotiation.proposingSquadId, amount: -negotiation.coinAmount },
    { squadId: negotiation.targetSquadId, amount: negotiation.coinAmount },
  ];
};
