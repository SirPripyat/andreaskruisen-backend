import { NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from '../../notifications.repository';
import { MarkNotificationReadUseCase } from '../mark-notification-read.use-case';

const buildUseCase = (exists = true) => {
  const notificationsRepository = {
    existsForUser: jest.fn().mockResolvedValue(exists),
    markRead: jest
      .fn()
      .mockResolvedValue({ id: 'notification-1', readAt: new Date() }),
  } as unknown as NotificationsRepository;

  const useCase = new MarkNotificationReadUseCase(notificationsRepository);

  return { useCase, notificationsRepository };
};

describe('MarkNotificationReadUseCase', () => {
  it('marca como lida quando a notificação pertence ao usuário', async () => {
    const { useCase, notificationsRepository } = buildUseCase(true);

    await useCase.execute('notification-1', 'season-1', 'user-1');

    expect(notificationsRepository.existsForUser).toHaveBeenCalledWith(
      'notification-1',
      'season-1',
      'user-1',
    );
    expect(notificationsRepository.markRead).toHaveBeenCalledWith(
      'notification-1',
    );
  });

  it('rejeita marcar como lida uma notificação de outro usuário', async () => {
    const { useCase, notificationsRepository } = buildUseCase(false);

    await expect(
      useCase.execute('notification-1', 'season-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);
    expect(notificationsRepository.markRead).not.toHaveBeenCalled();
  });
});
