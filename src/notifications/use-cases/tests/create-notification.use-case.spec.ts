import { NotificationsRepository } from '../../notifications.repository';
import { CreateNotificationUseCase } from '../create-notification.use-case';

const buildUseCase = () => {
  const notificationsRepository = {
    create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  } as unknown as NotificationsRepository;

  const useCase = new CreateNotificationUseCase(notificationsRepository);

  return { useCase, notificationsRepository };
};

describe('CreateNotificationUseCase', () => {
  it('repassa os dados recebidos direto pro repositório', async () => {
    const { useCase, notificationsRepository } = buildUseCase();

    await useCase.execute({
      seasonId: 'season-1',
      userId: 'user-1',
      type: 'TRANSFER_COMPLETED',
      title: 'Transferência concluída',
      message: 'Brandt saiu e Dembélé entrou, por 8 moeda(s).',
      metadata: { transferId: 'transfer-1' },
    });

    expect(notificationsRepository.create).toHaveBeenCalledWith({
      seasonId: 'season-1',
      userId: 'user-1',
      type: 'TRANSFER_COMPLETED',
      title: 'Transferência concluída',
      message: 'Brandt saiu e Dembélé entrou, por 8 moeda(s).',
      metadata: { transferId: 'transfer-1' },
    });
  });
});
