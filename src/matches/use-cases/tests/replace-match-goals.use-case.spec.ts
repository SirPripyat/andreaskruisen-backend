import { ConflictException } from '@nestjs/common';
import { TournamentsRepository } from '../../../tournaments/tournaments.repository';
import { MatchesRepository } from '../../matches.repository';
import { MatchForGoals } from '../../types';
import { AwardMatchPrizesUseCase } from '../award-match-prizes.use-case';
import { GetMatchDetailUseCase } from '../get-match-detail.use-case';
import { ReplaceMatchGoalsUseCase } from '../replace-match-goals.use-case';

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
  tournamentFormat: 'KNOCKOUT',
  phaseId: 'phase-1',
  phaseOrder: 1,
  phaseType: 'KNOCKOUT',
  homeTeamId: 'home-team',
  awayTeamId: 'away-team',
  playedAt: null,
  ...overrides,
});

const buildUseCase = (match: MatchForGoals) => {
  const matchesRepository = {
    findMatchForGoals: jest.fn().mockResolvedValue(match),
  } as unknown as MatchesRepository;

  const tournamentsRepository = {
    hasLaterPhase: jest.fn().mockResolvedValue(false),
  } as unknown as TournamentsRepository;

  const getMatchDetailUseCase = {
    execute: jest.fn(),
  } as unknown as GetMatchDetailUseCase;

  const awardMatchPrizesUseCase = {
    execute: jest.fn(),
  } as unknown as AwardMatchPrizesUseCase;

  const useCase = new ReplaceMatchGoalsUseCase(
    matchesRepository,
    tournamentsRepository,
    getMatchDetailUseCase,
    awardMatchPrizesUseCase,
  );

  return { useCase, matchesRepository, tournamentsRepository };
};

describe('ReplaceMatchGoalsUseCase', () => {
  it('rejeita editar o placar de uma partida cujo torneio já foi encerrado', async () => {
    const { useCase, matchesRepository, tournamentsRepository } = buildUseCase(
      buildMatch({ tournamentFinishedAt: new Date() }),
    );

    await expect(useCase.execute('match-1', { goals: [] })).rejects.toThrow(
      ConflictException,
    );

    expect(matchesRepository.findMatchForGoals).toHaveBeenCalledWith('match-1');
    // Falha antes de qualquer outra checagem/escrita.
    expect(tournamentsRepository.hasLaterPhase).not.toHaveBeenCalled();
  });
});
