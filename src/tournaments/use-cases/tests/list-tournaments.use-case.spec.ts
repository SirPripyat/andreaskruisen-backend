import { Tournament } from '../../../../generated/prisma/client';
import { TournamentsRepository } from '../../tournaments.repository';
import { PhaseSummary, TeamSummary } from '../../types';
import { GetChampionTeamIdUseCase } from '../get-champion-team-id.use-case';
import { ListTournamentsUseCase } from '../list-tournaments.use-case';

const buildTournament = (overrides: Partial<Tournament>): Tournament =>
  ({
    id: 'tournament-1',
    seasonId: 'season-1',
    name: 'Torneio 1',
    format: 'KNOCKOUT',
    maxTeams: 8,
    createdAt: new Date(),
    finishedAt: null,
    ...overrides,
  }) as Tournament;

const phase: PhaseSummary = {
  id: 'phase-1',
  type: 'KNOCKOUT',
  order: 1,
  name: 'Final',
};

const team: TeamSummary = {
  id: 'team-1',
  name: 'Ajax',
  crestUrl: 'https://crest/ajax.png',
};

const buildUseCase = (tournaments: Tournament[]) => {
  const tournamentsRepository = {
    findBySeason: jest.fn().mockResolvedValue(tournaments),
    findLatestPhase: jest.fn().mockResolvedValue(phase),
    findTeamsByIds: jest.fn().mockResolvedValue([team]),
    findOwnersByTeamIds: jest
      .fn()
      .mockResolvedValue(new Map([[team.id, { id: 'user-1', name: 'Leo' }]])),
  } as unknown as TournamentsRepository;

  const getChampionTeamIdUseCase = {
    execute: jest.fn().mockResolvedValue(team.id),
  } as unknown as GetChampionTeamIdUseCase;

  const useCase = new ListTournamentsUseCase(
    tournamentsRepository,
    getChampionTeamIdUseCase,
  );

  return { useCase, tournamentsRepository, getChampionTeamIdUseCase };
};

describe('ListTournamentsUseCase', () => {
  it('inclui a fase atual e o campeão para um torneio encerrado', async () => {
    const tournament = buildTournament({ finishedAt: new Date() });
    const { useCase, getChampionTeamIdUseCase } = buildUseCase([tournament]);

    const [result] = await useCase.execute('season-1');

    expect(getChampionTeamIdUseCase.execute).toHaveBeenCalledWith(
      tournament.id,
    );
    expect(result.currentPhase).toEqual(phase);
    expect(result.champion).toEqual({
      ...team,
      owner: { id: 'user-1', name: 'Leo' },
    });
  });

  it('não calcula campeão para um torneio em andamento', async () => {
    const tournament = buildTournament({ finishedAt: null });
    const { useCase, getChampionTeamIdUseCase } = buildUseCase([tournament]);

    const [result] = await useCase.execute('season-1');

    expect(getChampionTeamIdUseCase.execute).not.toHaveBeenCalled();
    expect(result.champion).toBeNull();
  });
});
