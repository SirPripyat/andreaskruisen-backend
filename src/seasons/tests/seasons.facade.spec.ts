import { EventEmitter2 } from '@nestjs/event-emitter';
import { SEASON_STARTED_EVENT } from '../../notifications/events';
import { SeasonsFacade } from '../seasons.facade';
import {
  FindSeasonUseCase,
  GetActiveSeasonUseCase,
  ListSeasonsUseCase,
  RemoveSeasonUseCase,
  SelectActiveSeasonUseCase,
  StartSeasonUseCase,
  UpdateSeasonUseCase,
} from '../use-cases';

const buildFacade = () => {
  const startSeasonUseCase = {
    execute: jest
      .fn()
      .mockResolvedValue({ id: 'season-1', name: 'Temporada 1' }),
  } as unknown as StartSeasonUseCase;
  const listSeasonsUseCase = {} as unknown as ListSeasonsUseCase;
  const getActiveSeasonUseCase = {} as unknown as GetActiveSeasonUseCase;
  const findSeasonUseCase = {} as unknown as FindSeasonUseCase;
  const updateSeasonUseCase = {} as unknown as UpdateSeasonUseCase;
  const removeSeasonUseCase = {} as unknown as RemoveSeasonUseCase;
  const selectActiveSeasonUseCase = {} as unknown as SelectActiveSeasonUseCase;
  const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

  const facade = new SeasonsFacade(
    startSeasonUseCase,
    listSeasonsUseCase,
    getActiveSeasonUseCase,
    findSeasonUseCase,
    updateSeasonUseCase,
    removeSeasonUseCase,
    selectActiveSeasonUseCase,
    eventEmitter,
  );

  return { facade, eventEmitter };
};

describe('SeasonsFacade', () => {
  it('emite o evento de temporada iniciada só depois que a temporada persiste', async () => {
    const { facade, eventEmitter } = buildFacade();

    const result = await facade.start({
      name: 'Temporada 1',
      squads: [{ userId: 'user-1', teamId: 'team-1' }],
    });

    expect(result.id).toBe('season-1');
    expect(eventEmitter.emit).toHaveBeenCalledWith(SEASON_STARTED_EVENT, {
      seasonId: 'season-1',
      seasonName: 'Temporada 1',
    });
  });
});
