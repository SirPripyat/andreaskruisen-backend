import { NotificationsRepository } from '../../notifications.repository';
import { ListNotificationsUseCase } from '../list-notifications.use-case';

const buildUseCase = () => {
  const notificationsRepository = {
    findManyForUser: jest.fn().mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    }),
  } as unknown as NotificationsRepository;

  const useCase = new ListNotificationsUseCase(notificationsRepository);

  return { useCase, notificationsRepository };
};

describe('ListNotificationsUseCase', () => {
  it('lista as notificações só do usuário logado na temporada atual, respeitando a paginação pedida', async () => {
    const { useCase, notificationsRepository } = buildUseCase();

    await useCase.execute('season-1', 'user-1', { page: 2, pageSize: 10 });

    expect(notificationsRepository.findManyForUser).toHaveBeenCalledWith(
      'season-1',
      'user-1',
      { page: 2, pageSize: 10 },
    );
  });
});
