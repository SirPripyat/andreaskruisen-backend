import { NegotiationWindowRepository } from '../../negotiation-window.repository';
import { GetNegotiationWindowStatusUseCase } from '../get-negotiation-window-status.use-case';

describe('GetNegotiationWindowStatusUseCase', () => {
  it('deriva a janela aberta como a do histórico com closedAt null', async () => {
    const history = [
      { id: 'window-2', closedAt: null, feeEnabled: true },
      { id: 'window-1', closedAt: new Date(), feeEnabled: false },
    ];
    const negotiationWindowRepository = {
      findHistory: jest.fn().mockResolvedValue(history),
    } as unknown as NegotiationWindowRepository;
    const useCase = new GetNegotiationWindowStatusUseCase(
      negotiationWindowRepository,
    );

    const status = await useCase.execute('season-1');

    expect(status.open).toEqual(history[0]);
    expect(status.history).toEqual(history);
  });

  it('open é null quando nenhuma janela do histórico está aberta', async () => {
    const history = [
      { id: 'window-1', closedAt: new Date(), feeEnabled: false },
    ];
    const negotiationWindowRepository = {
      findHistory: jest.fn().mockResolvedValue(history),
    } as unknown as NegotiationWindowRepository;
    const useCase = new GetNegotiationWindowStatusUseCase(
      negotiationWindowRepository,
    );

    const status = await useCase.execute('season-1');

    expect(status.open).toBeNull();
  });
});
