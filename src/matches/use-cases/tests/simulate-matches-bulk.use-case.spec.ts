import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchesRepository } from '../../matches.repository';
import { MatchForGoals } from '../../types';
import { SimulateMatchUseCase } from '../simulate-match.use-case';
import { SimulateMatchesBulkUseCase } from '../simulate-matches-bulk.use-case';

// @Transactional() exige um TransactionHost real — ver mesmo comentário em
// accept-negotiation.use-case.spec.ts.
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
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

describe('SimulateMatchesBulkUseCase', () => {
  it('simula as partidas pendentes e pula as já jogadas, sem derrubar o lote', async () => {
    const pending = buildMatch({ id: 'match-1' });
    const alreadyPlayed = buildMatch({ id: 'match-2', playedAt: new Date() });

    const matchesRepository = {
      findManyForBulkSimulation: jest
        .fn()
        .mockResolvedValue([pending, alreadyPlayed]),
    } as unknown as MatchesRepository;

    const simulateMatchUseCase = {
      simulateCore: jest.fn(),
    } as unknown as SimulateMatchUseCase;

    const useCase = new SimulateMatchesBulkUseCase(
      matchesRepository,
      simulateMatchUseCase,
    );

    const result = await useCase.execute(['match-1', 'match-2']);

    expect(simulateMatchUseCase.simulateCore).toHaveBeenCalledTimes(1);
    expect(simulateMatchUseCase.simulateCore).toHaveBeenCalledWith('match-1');
    expect(result).toEqual({
      tournamentId: 'tournament-1',
      simulatedMatchIds: ['match-1'],
      skipped: [
        { matchId: 'match-2', reason: 'Partida já tem resultado registrado' },
      ],
    });
  });

  it('deduplica IDs repetidos antes de buscar e simular', async () => {
    const match = buildMatch({ id: 'match-1' });

    const matchesRepository = {
      findManyForBulkSimulation: jest.fn().mockResolvedValue([match]),
    } as unknown as MatchesRepository;

    const simulateMatchUseCase = {
      simulateCore: jest.fn(),
    } as unknown as SimulateMatchUseCase;

    const useCase = new SimulateMatchesBulkUseCase(
      matchesRepository,
      simulateMatchUseCase,
    );

    await useCase.execute(['match-1', 'match-1']);

    expect(matchesRepository.findManyForBulkSimulation).toHaveBeenCalledWith([
      'match-1',
    ]);
    expect(simulateMatchUseCase.simulateCore).toHaveBeenCalledTimes(1);
  });

  it('lança NotFoundException se alguma partida não existir', async () => {
    const matchesRepository = {
      findManyForBulkSimulation: jest
        .fn()
        .mockResolvedValue([buildMatch({ id: 'match-1' })]),
    } as unknown as MatchesRepository;

    const simulateMatchUseCase = {
      simulateCore: jest.fn(),
    } as unknown as SimulateMatchUseCase;

    const useCase = new SimulateMatchesBulkUseCase(
      matchesRepository,
      simulateMatchUseCase,
    );

    await expect(useCase.execute(['match-1', 'match-missing'])).rejects.toThrow(
      NotFoundException,
    );
    expect(simulateMatchUseCase.simulateCore).not.toHaveBeenCalled();
  });

  it('lança BadRequestException se as partidas forem de torneios diferentes', async () => {
    const matchA = buildMatch({ id: 'match-1', tournamentId: 'tournament-1' });
    const matchB = buildMatch({ id: 'match-2', tournamentId: 'tournament-2' });

    const matchesRepository = {
      findManyForBulkSimulation: jest.fn().mockResolvedValue([matchA, matchB]),
    } as unknown as MatchesRepository;

    const simulateMatchUseCase = {
      simulateCore: jest.fn(),
    } as unknown as SimulateMatchUseCase;

    const useCase = new SimulateMatchesBulkUseCase(
      matchesRepository,
      simulateMatchUseCase,
    );

    await expect(useCase.execute(['match-1', 'match-2'])).rejects.toThrow(
      BadRequestException,
    );
    expect(simulateMatchUseCase.simulateCore).not.toHaveBeenCalled();
  });
});
