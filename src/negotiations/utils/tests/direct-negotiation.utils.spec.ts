import {
  resolveNegotiationCoinTransactions,
  resolveNegotiationCouponRecipients,
} from '../direct-negotiation.utils';

describe('resolveNegotiationCouponRecipients', () => {
  it('concede cupom só ao proposingSquad numa venda (só outgoingPlayer)', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerId: 'player-1',
        incomingPlayerId: null,
      }),
    ).toEqual(['proposing']);
  });

  it('concede cupom só ao targetSquad numa compra (só incomingPlayer)', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerId: null,
        incomingPlayerId: 'player-1',
      }),
    ).toEqual(['target']);
  });

  it('concede cupom aos dois squads numa troca, com ou sem compensação', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerId: 'player-1',
        incomingPlayerId: 'player-2',
      }),
    ).toEqual(['proposing', 'target']);
  });
});

describe('resolveNegotiationCoinTransactions', () => {
  it('não gera lançamento quando não há compensação em moedas', () => {
    expect(
      resolveNegotiationCoinTransactions({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        coinAmount: null,
      }),
    ).toEqual([]);

    expect(
      resolveNegotiationCoinTransactions({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        coinAmount: 0,
      }),
    ).toEqual([]);
  });

  it('proposingSquad paga targetSquad quando coinAmount é positivo', () => {
    expect(
      resolveNegotiationCoinTransactions({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        coinAmount: 30,
      }),
    ).toEqual([
      { squadId: 'proposing', amount: -30 },
      { squadId: 'target', amount: 30 },
    ]);
  });

  it('targetSquad paga proposingSquad quando coinAmount é negativo', () => {
    expect(
      resolveNegotiationCoinTransactions({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        coinAmount: -50,
      }),
    ).toEqual([
      { squadId: 'proposing', amount: 50 },
      { squadId: 'target', amount: -50 },
    ]);
  });
});
