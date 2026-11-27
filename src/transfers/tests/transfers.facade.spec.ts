import { EventEmitter2 } from '@nestjs/event-emitter';
import { TRANSFER_COMPLETED_EVENT } from '../../notifications/events';
import { TransfersFacade } from '../transfers.facade';
import {
  CreateTransferUseCase,
  ListTransfersUseCase,
  QuoteTransferUseCase,
} from '../use-cases';

const buildFacade = (
  transfer: Record<string, unknown> = {
    id: 'transfer-1',
    cost: 8,
    requestedBy: { id: 'user-1', name: 'Alice' },
    outgoingPlayers: [{ name: 'Brandt' }],
    incomingPlayers: [{ name: 'Dembélé' }],
  },
) => {
  const createTransferUseCase = {
    execute: jest.fn().mockResolvedValue(transfer),
  } as unknown as CreateTransferUseCase;
  const listTransfersUseCase = {} as unknown as ListTransfersUseCase;
  const quoteTransferUseCase = {} as unknown as QuoteTransferUseCase;
  const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

  const facade = new TransfersFacade(
    createTransferUseCase,
    listTransfersUseCase,
    quoteTransferUseCase,
    eventEmitter,
  );

  return { facade, eventEmitter };
};

describe('TransfersFacade', () => {
  it('emite o evento de transferência concluída só depois que a troca persiste', async () => {
    const { facade, eventEmitter } = buildFacade();

    const result = await facade.create(
      'season-1',
      {
        id: 'user-1',
        name: 'Alice',
        role: 'PARTICIPANT',
        selectedSeasonId: null,
      },
      {
        outgoingPlayerIds: ['player-out'],
        incomingPlayerIds: ['player-in'],
        useCoupon: false,
      },
    );

    expect(result.id).toBe('transfer-1');
    expect(eventEmitter.emit).toHaveBeenCalledWith(TRANSFER_COMPLETED_EVENT, {
      seasonId: 'season-1',
      userId: 'user-1',
      transferId: 'transfer-1',
      outgoingPlayerName: 'Brandt',
      incomingPlayerName: 'Dembélé',
      cost: 8,
    });
  });

  it('junta os nomes numa troca multi-jogador (2 jogadores de um lado)', async () => {
    const { facade, eventEmitter } = buildFacade({
      id: 'transfer-2',
      cost: 50,
      requestedBy: { id: 'user-1', name: 'Alice' },
      outgoingPlayers: [{ name: 'Brandt' }, { name: 'Reus' }],
      incomingPlayers: [{ name: 'Dembélé' }],
    });

    await facade.create(
      'season-1',
      {
        id: 'user-1',
        name: 'Alice',
        role: 'PARTICIPANT',
        selectedSeasonId: null,
      },
      {
        outgoingPlayerIds: ['player-out-1', 'player-out-2'],
        incomingPlayerIds: ['player-in'],
        useCoupon: false,
      },
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(TRANSFER_COMPLETED_EVENT, {
      seasonId: 'season-1',
      userId: 'user-1',
      transferId: 'transfer-2',
      outgoingPlayerName: 'Brandt, Reus',
      incomingPlayerName: 'Dembélé',
      cost: 50,
    });
  });
});
