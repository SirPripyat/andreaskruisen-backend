import { ConflictException } from '@nestjs/common';
import { Tournament } from '../../../../generated/prisma/client';
import { TournamentsRepository } from '../../tournaments.repository';
import { FindTournamentOrThrowUseCase } from '../find-tournament-or-throw.use-case';
import { FinishTournamentUseCase } from '../finish-tournament.use-case';
import { IsTournamentFinishedUseCase } from '../is-tournament-finished.use-case';

const buildUseCase = (overrides: {
  tournament: Partial<Tournament>;
  isFinished: boolean;
}) => {
  const tournament = {
    id: 'tournament-1',
    seasonId: 'season-1',
    name: 'Torneio 1',
    format: 'KNOCKOUT',
    maxTeams: 8,
    createdAt: new Date(),
    finishedAt: null,
    ...overrides.tournament,
  } as Tournament;

  const tournamentsRepository = {
    finish: jest
      .fn()
      .mockResolvedValue({ ...tournament, finishedAt: new Date() }),
  } as unknown as TournamentsRepository;

  const findTournamentOrThrowUseCase = {
    execute: jest.fn().mockResolvedValue(tournament),
  } as unknown as FindTournamentOrThrowUseCase;

  const isTournamentFinishedUseCase = {
    execute: jest.fn().mockResolvedValue(overrides.isFinished),
  } as unknown as IsTournamentFinishedUseCase;

  const useCase = new FinishTournamentUseCase(
    tournamentsRepository,
    findTournamentOrThrowUseCase,
    isTournamentFinishedUseCase,
  );

  return { useCase, tournamentsRepository, tournament };
};

describe('FinishTournamentUseCase', () => {
  it('encerra o torneio quando a fase decisiva já terminou', async () => {
    const { useCase, tournamentsRepository } = buildUseCase({
      tournament: {},
      isFinished: true,
    });

    await useCase.execute('tournament-1');

    expect(tournamentsRepository.finish).toHaveBeenCalledWith('tournament-1');
  });

  it('rejeita encerrar quando o torneio ainda não terminou', async () => {
    const { useCase, tournamentsRepository } = buildUseCase({
      tournament: {},
      isFinished: false,
    });

    await expect(useCase.execute('tournament-1')).rejects.toThrow(
      ConflictException,
    );
    expect(tournamentsRepository.finish).not.toHaveBeenCalled();
  });

  it('rejeita encerrar um torneio que já está encerrado', async () => {
    const { useCase, tournamentsRepository } = buildUseCase({
      tournament: { finishedAt: new Date() },
      isFinished: true,
    });

    await expect(useCase.execute('tournament-1')).rejects.toThrow(
      ConflictException,
    );
    expect(tournamentsRepository.finish).not.toHaveBeenCalled();
  });
});
