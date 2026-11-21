import { MatchesRepository } from '../../matches.repository';
import { MatchForGoals } from '../../types';
import { AwardMatchPrizesUseCase } from '../award-match-prizes.use-case';
import { GetMatchDetailUseCase } from '../get-match-detail.use-case';
import { SimulateMatchUseCase } from '../simulate-match.use-case';

// @Transactional() exige um TransactionHost real — ver mesmo comentário em
// accept-negotiation.use-case.spec.ts.
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

jest.mock('../../utils', () => ({
  simulateMatch: jest.fn().mockReturnValue({
    homeGoals: [{ scorerId: 'home-player', assistId: null }],
    awayGoals: [],
  }),
}));

const buildMatch = (overrides: Partial<MatchForGoals> = {}): MatchForGoals => ({
  id: 'match-1',
  tournamentId: 'tournament-1',
  tournamentFinishedAt: null,
  seasonId: 'season-1',
  tournamentFormat: 'LEAGUE',
  phaseId: 'phase-1',
  phaseOrder: 1,
  phaseType: 'GROUP',
  homeTeamId: 'home-team',
  awayTeamId: 'away-team',
  playedAt: null,
  ...overrides,
});

describe('SimulateMatchUseCase', () => {
  it('premia o resultado simulado, igual a uma edição manual de placar', async () => {
    const match = buildMatch();

    const matchesRepository = {
      findMatchForGoals: jest.fn().mockResolvedValue(match),
      findPlayersForSimulation: jest.fn().mockResolvedValue([
        { id: 'home-player', teamId: 'home-team', overallRating: 80 },
        { id: 'away-player', teamId: 'away-team', overallRating: 80 },
      ]),
      replaceMatchGoals: jest.fn(),
    } as unknown as MatchesRepository;

    const getMatchDetailUseCase = {
      execute: jest.fn(),
    } as unknown as GetMatchDetailUseCase;

    const awardMatchPrizesUseCase = {
      execute: jest.fn(),
    } as unknown as AwardMatchPrizesUseCase;

    const useCase = new SimulateMatchUseCase(
      matchesRepository,
      getMatchDetailUseCase,
      awardMatchPrizesUseCase,
    );

    await useCase.execute('match-1');

    expect(awardMatchPrizesUseCase.execute).toHaveBeenCalledWith(
      match,
      1,
      0,
      null,
    );
  });

  it('simulateCore premia o resultado sem buscar o detail da partida', async () => {
    const match = buildMatch();

    const matchesRepository = {
      findMatchForGoals: jest.fn().mockResolvedValue(match),
      findPlayersForSimulation: jest.fn().mockResolvedValue([
        { id: 'home-player', teamId: 'home-team', overallRating: 80 },
        { id: 'away-player', teamId: 'away-team', overallRating: 80 },
      ]),
      replaceMatchGoals: jest.fn(),
    } as unknown as MatchesRepository;

    const getMatchDetailUseCase = {
      execute: jest.fn(),
    } as unknown as GetMatchDetailUseCase;

    const awardMatchPrizesUseCase = {
      execute: jest.fn(),
    } as unknown as AwardMatchPrizesUseCase;

    const useCase = new SimulateMatchUseCase(
      matchesRepository,
      getMatchDetailUseCase,
      awardMatchPrizesUseCase,
    );

    await useCase.simulateCore('match-1');

    expect(awardMatchPrizesUseCase.execute).toHaveBeenCalledWith(
      match,
      1,
      0,
      null,
    );
    expect(getMatchDetailUseCase.execute).not.toHaveBeenCalled();
  });
});
