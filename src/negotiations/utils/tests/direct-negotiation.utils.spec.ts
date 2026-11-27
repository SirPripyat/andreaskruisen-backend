import {
  resolveNegotiationCoinTransactions,
  resolveNegotiationCouponRecipients,
} from '../direct-negotiation.utils';

describe('resolveNegotiationCouponRecipients', () => {
  it('concede cupom só ao proposingSquad numa venda (só outgoingPlayers)', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerIds: ['player-1'],
        incomingPlayerIds: [],
      }),
    ).toEqual(['proposing']);
  });

  it('concede cupom só ao targetSquad numa compra (só incomingPlayers)', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerIds: [],
        incomingPlayerIds: ['player-1'],
      }),
    ).toEqual(['target']);
  });

  it('concede cupom aos dois squads numa troca, com ou sem compensação', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerIds: ['player-1'],
        incomingPlayerIds: ['player-2'],
      }),
    ).toEqual(['proposing', 'target']);
  });

  it('concede cupom aos dois squads numa troca multi-jogador (2 de um lado)', () => {
    expect(
      resolveNegotiationCouponRecipients({
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingPlayerIds: ['player-1', 'player-2'],
        incomingPlayerIds: ['player-3'],
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
