import { UserRole } from '../../../../generated/prisma/client';
import { SquadsRepository } from '../../../squads/squads.repository';
import { UsersRepository } from '../../../users/users.repository';
import { CreateNotificationUseCase } from '../../use-cases';
import { NotificationEventsListener } from '../notification-events.listener';

const buildListener = () => {
  const createNotificationUseCase = {
    execute: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  } as unknown as CreateNotificationUseCase;

  const squadsRepository = {
    findUserIdById: jest.fn().mockResolvedValue('user-1'),
    findAllForSeason: jest
      .fn()
      .mockResolvedValue([
        { user: { id: 'user-1' } },
        { user: { id: 'user-2' } },
      ]),
  } as unknown as SquadsRepository;

  const usersRepository = {
    findAllByRole: jest
      .fn()
      .mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]),
  } as unknown as UsersRepository;

  const listener = new NotificationEventsListener(
    createNotificationUseCase,
    squadsRepository,
    usersRepository,
  );

  return {
    listener,
    createNotificationUseCase,
    squadsRepository,
    usersRepository,
  };
};

describe('NotificationEventsListener', () => {
  it('cria a notificação de transferência pro usuário que fez a troca', async () => {
    const { listener, createNotificationUseCase } = buildListener();

    await listener.handleTransferCompleted({
      seasonId: 'season-1',
      userId: 'user-1',
      transferId: 'transfer-1',
      outgoingPlayerName: 'Brandt',
      incomingPlayerName: 'Dembélé',
      cost: 8,
    });

    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-1',
        type: 'TRANSFER_COMPLETED',
        metadata: { transferId: 'transfer-1' },
      }),
    );
  });

  it('resolve o dono do squad antes de notificar o prêmio de torneio', async () => {
    const { listener, createNotificationUseCase, squadsRepository } =
      buildListener();

    await listener.handleTournamentPrizeAwarded({
      seasonId: 'season-1',
      squadId: 'squad-1',
      amount: 5,
      type: 'PRIZE_PHASE',
      phaseId: 'phase-1',
    });

    expect(squadsRepository.findUserIdById).toHaveBeenCalledWith('squad-1');
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-1',
        type: 'TOURNAMENT_PRIZE_AWARDED',
        metadata: expect.objectContaining({ squadId: 'squad-1', amount: 5 }),
      }),
    );
  });

  it('não notifica prêmio de torneio quando o squad não existe mais', async () => {
    const { listener, createNotificationUseCase, squadsRepository } =
      buildListener();
    (squadsRepository.findUserIdById as jest.Mock).mockResolvedValue(null);

    await listener.handleTournamentPrizeAwarded({
      seasonId: 'season-1',
      squadId: 'squad-removido',
      amount: 5,
      type: 'RANKING',
    });

    expect(createNotificationUseCase.execute).not.toHaveBeenCalled();
  });

  it('notifica o dono do targetSquad quando recebe uma proposta', async () => {
    const { listener, createNotificationUseCase } = buildListener();

    await listener.handleNegotiationProposed({
      seasonId: 'season-1',
      targetUserId: 'user-target',
      negotiationId: 'negotiation-1',
      proposingTeamName: 'Ajax',
    });

    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-target',
        type: 'NEGOTIATION_PROPOSED',
        metadata: { negotiationId: 'negotiation-1' },
      }),
    );
  });

  it('notifica o dono do proposingSquad quando a proposta é aceita', async () => {
    const { listener, createNotificationUseCase } = buildListener();

    await listener.handleNegotiationAccepted({
      seasonId: 'season-1',
      proposingUserId: 'user-proposing',
      negotiationId: 'negotiation-1',
      targetTeamName: 'Feyenoord',
    });

    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-proposing',
        type: 'NEGOTIATION_ACCEPTED',
        metadata: { negotiationId: 'negotiation-1' },
      }),
    );
  });

  it('notifica o dono do proposingSquad quando a proposta é rejeitada', async () => {
    const { listener, createNotificationUseCase } = buildListener();

    await listener.handleNegotiationRejected({
      seasonId: 'season-1',
      proposingUserId: 'user-proposing',
      negotiationId: 'negotiation-1',
      targetTeamName: 'Feyenoord',
    });

    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-proposing',
        type: 'NEGOTIATION_REJECTED',
        metadata: { negotiationId: 'negotiation-1' },
      }),
    );
  });

  it('notifica todos os participantes quando a temporada começa', async () => {
    const { listener, createNotificationUseCase, squadsRepository } =
      buildListener();

    await listener.handleSeasonStarted({
      seasonId: 'season-1',
      seasonName: 'Temporada 1',
    });

    expect(squadsRepository.findAllForSeason).toHaveBeenCalledWith('season-1');
    expect(createNotificationUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-1',
        type: 'SEASON_STARTED',
      }),
    );
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'user-2',
        type: 'SEASON_STARTED',
      }),
    );
  });

  it('notifica todos os admins quando a auditoria encontra divergência', async () => {
    const { listener, createNotificationUseCase, usersRepository } =
      buildListener();

    await listener.handleAuditDiscrepancyFound({
      seasonId: 'season-1',
      findingsCount: 3,
    });

    expect(usersRepository.findAllByRole).toHaveBeenCalledWith(UserRole.ADMIN);
    expect(createNotificationUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'admin-1',
        type: 'AUDIT_DISCREPANCY_FOUND',
      }),
    );
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-1',
        userId: 'admin-2',
        type: 'AUDIT_DISCREPANCY_FOUND',
      }),
    );
  });
});
