import { NotificationsRepository } from '../../notifications.repository';
import { MarkAllNotificationsReadUseCase } from '../mark-all-notifications-read.use-case';

const buildUseCase = (count = 3) => {
  const notificationsRepository = {
    markAllReadForUser: jest.fn().mockResolvedValue({ count }),
  } as unknown as NotificationsRepository;

  const useCase = new MarkAllNotificationsReadUseCase(notificationsRepository);

  return { useCase, notificationsRepository };
};

describe('MarkAllNotificationsReadUseCase', () => {
  it('marca como lidas todas as notificações não lidas do usuário na temporada', async () => {
    const { useCase, notificationsRepository } = buildUseCase(3);

    const result = await useCase.execute('season-1', 'user-1');

    expect(notificationsRepository.markAllReadForUser).toHaveBeenCalledWith(
      'season-1',
      'user-1',
    );
    expect(result).toEqual({ count: 3 });
  });
});
