import { ClsService } from 'nestjs-cls';
import { TournamentsRepository } from '../../tournaments.repository';
import { AwardTournamentPrizeUseCase } from '../award-tournament-prize.use-case';

const buildUseCase = (recordedTotal: number) => {
  const tournamentsRepository = {
    getRecordedPrizeTotal: jest.fn().mockResolvedValue(recordedTotal),
    createPrizeTransaction: jest.fn().mockResolvedValue(undefined),
  } as unknown as TournamentsRepository;

  const store = new Map<string, unknown>();
  const cls = {
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => store.set(key, value)),
  } as unknown as ClsService;

  const useCase = new AwardTournamentPrizeUseCase(tournamentsRepository, cls);

  return { useCase, tournamentsRepository, cls, store };
};

describe('AwardTournamentPrizeUseCase', () => {
  it('lança a diferença e empilha o evento pendente quando o valor muda', async () => {
    const { useCase, tournamentsRepository, store } = buildUseCase(2);

    await useCase.execute({
      seasonId: 'season-1',
      squadId: 'squad-1',
      type: 'PRIZE_PHASE',
      targetAmount: 5,
      phaseId: 'phase-1',
    });

    expect(tournamentsRepository.createPrizeTransaction).toHaveBeenCalledWith({
      squadId: 'squad-1',
      type: 'PRIZE_PHASE',
      amount: 3,
      matchId: undefined,
      phaseId: 'phase-1',
    });
    expect(store.get('pendingTournamentPrizeEvents')).toEqual([
      {
        seasonId: 'season-1',
        squadId: 'squad-1',
        type: 'PRIZE_PHASE',
        amount: 3,
        matchId: undefined,
        phaseId: 'phase-1',
      },
    ]);
  });

  it('não lança nada nem empilha evento quando o valor já está correto', async () => {
    const { useCase, tournamentsRepository, store } = buildUseCase(5);

    await useCase.execute({
      seasonId: 'season-1',
      squadId: 'squad-1',
      type: 'PRIZE_PHASE',
      targetAmount: 5,
      phaseId: 'phase-1',
    });

    expect(tournamentsRepository.createPrizeTransaction).not.toHaveBeenCalled();
    expect(store.get('pendingTournamentPrizeEvents')).toBeUndefined();
  });

  it('empilha vários eventos na mesma requisição sem sobrescrever os anteriores', async () => {
    const { useCase, store } = buildUseCase(0);

    await useCase.execute({
      seasonId: 'season-1',
      squadId: 'squad-1',
      type: 'RANKING',
      targetAmount: 2,
    });
    await useCase.execute({
      seasonId: 'season-1',
      squadId: 'squad-2',
      type: 'RANKING',
      targetAmount: 3,
    });

    expect(store.get('pendingTournamentPrizeEvents')).toHaveLength(2);
  });
});
