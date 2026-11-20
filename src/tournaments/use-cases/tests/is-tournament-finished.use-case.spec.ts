import { Tournament } from '../../../../generated/prisma/client';
import { TournamentsRepository } from '../../tournaments.repository';
import { IsTournamentFinishedUseCase } from '../is-tournament-finished.use-case';

const buildUseCase = (overrides: {
  latestPhase?: { id: string; type: 'GROUP' | 'KNOCKOUT' } | null;
  unplayedCount?: number;
  matchCount?: number;
}) => {
  const tournamentsRepository = {
    findLatestPhase: jest.fn().mockResolvedValue(overrides.latestPhase ?? null),
    countUnplayedMatches: jest
      .fn()
      .mockResolvedValue(overrides.unplayedCount ?? 0),
    countMatches: jest.fn().mockResolvedValue(overrides.matchCount ?? 1),
  } as unknown as TournamentsRepository;

  const useCase = new IsTournamentFinishedUseCase(tournamentsRepository);

  return { useCase };
};

describe('IsTournamentFinishedUseCase', () => {
  it('não terminou quando ainda não existe fase nenhuma', async () => {
    const { useCase } = buildUseCase({ latestPhase: null });

    const result = await useCase.execute({
      id: 'tournament-1',
      format: 'LEAGUE',
    } as Tournament);

    expect(result).toBe(false);
  });

  it('não terminou quando a fase mais recente ainda tem partida pendente', async () => {
    const { useCase } = buildUseCase({
      latestPhase: { id: 'phase-1', type: 'GROUP' },
      unplayedCount: 1,
    });

    const result = await useCase.execute({
      id: 'tournament-1',
      format: 'LEAGUE',
    } as Tournament);

    expect(result).toBe(false);
  });

  it('terminou quando é LEAGUE e a fase mais recente está toda jogada', async () => {
    const { useCase } = buildUseCase({
      latestPhase: { id: 'phase-1', type: 'GROUP' },
      unplayedCount: 0,
    });

    const result = await useCase.execute({
      id: 'tournament-1',
      format: 'LEAGUE',
    } as Tournament);

    expect(result).toBe(true);
  });

  it('não terminou quando ainda está na fase de grupos de um GROUP_STAGE_KNOCKOUT', async () => {
    const { useCase } = buildUseCase({
      latestPhase: { id: 'phase-1', type: 'GROUP' },
      unplayedCount: 0,
    });

    const result = await useCase.execute({
      id: 'tournament-1',
      format: 'GROUP_STAGE_KNOCKOUT',
    } as Tournament);

    expect(result).toBe(false);
  });

  it('não terminou quando a fase de mata-mata ainda tem mais de uma partida (não é a final)', async () => {
    const { useCase } = buildUseCase({
      latestPhase: { id: 'phase-1', type: 'KNOCKOUT' },
      unplayedCount: 0,
      matchCount: 2,
    });

    const result = await useCase.execute({
      id: 'tournament-1',
      format: 'KNOCKOUT',
    } as Tournament);

    expect(result).toBe(false);
  });

  it('terminou quando a final do mata-mata (única partida da fase) já foi jogada', async () => {
    const { useCase } = buildUseCase({
      latestPhase: { id: 'phase-1', type: 'KNOCKOUT' },
      unplayedCount: 0,
      matchCount: 1,
    });

    const result = await useCase.execute({
      id: 'tournament-1',
      format: 'KNOCKOUT',
    } as Tournament);

    expect(result).toBe(true);
  });
});
