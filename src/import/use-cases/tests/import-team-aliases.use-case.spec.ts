import { TeamsRepository } from '../../../teams/teams.repository';
import { ImportTeamAliasesUseCase } from '../import-team-aliases.use-case';

const buildRawEntry = (overrides: Record<string, unknown> = {}) => ({
  json_name: 'Man Utd',
  resolved_team_name: 'Manchester United',
  ...overrides,
});

const buildFileBuffer = (entries: unknown[]): Buffer =>
  Buffer.from(JSON.stringify({ entries }));

const buildUseCase = () => {
  const teamsRepository = {
    findIdsByNames: jest.fn().mockResolvedValue(new Map<string, string[]>()),
    upsertAlias: jest.fn().mockResolvedValue(undefined),
  } as unknown as TeamsRepository;

  const useCase = new ImportTeamAliasesUseCase(teamsRepository);

  return { useCase, teamsRepository };
};

describe('ImportTeamAliasesUseCase', () => {
  it('cria o alias quando resolved_team_name bate com exatamente um time', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Manchester United', ['team-1']]]),
    );

    const buffer = buildFileBuffer([buildRawEntry()]);
    const summary = await useCase.execute(buffer);

    expect(summary.created).toBe(1);
    expect(summary.teamNotFound).toHaveLength(0);
    expect(summary.ambiguous).toHaveLength(0);
    expect(teamsRepository.upsertAlias).toHaveBeenCalledWith(
      'Man Utd',
      'team-1',
    );
  });

  it('conta como skipped quando resolved_team_name não está preenchido', async () => {
    const { useCase, teamsRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawEntry({ resolved_team_name: null }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.skipped).toBe(1);
    expect(summary.created).toBe(0);
    expect(teamsRepository.findIdsByNames).toHaveBeenCalledWith([]);
    expect(teamsRepository.upsertAlias).not.toHaveBeenCalled();
  });

  it('marca como teamNotFound quando resolved_team_name não bate com nenhum time', async () => {
    const { useCase, teamsRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawEntry({ resolved_team_name: 'Time Inexistente' }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.teamNotFound).toEqual(['Man Utd']);
    expect(summary.created).toBe(0);
    expect(teamsRepository.upsertAlias).not.toHaveBeenCalled();
  });

  it('marca como ambiguous quando resolved_team_name bate com mais de um time', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Nacional', ['team-1', 'team-2']]]),
    );

    const buffer = buildFileBuffer([
      buildRawEntry({ resolved_team_name: 'Nacional' }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.ambiguous).toEqual(['Man Utd']);
    expect(summary.created).toBe(0);
    expect(teamsRepository.upsertAlias).not.toHaveBeenCalled();
  });

  it('não derruba o import quando um item do JSON não bate com o schema', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Manchester United', ['team-1']]]),
    );

    const buffer = buildFileBuffer([
      buildRawEntry(),
      { json_name: '', resolved_team_name: 'Time Qualquer' },
    ]);

    const summary = await useCase.execute(buffer);

    expect(summary.created).toBe(1);
    expect(summary.invalid).toHaveLength(1);
    expect(summary.invalid[0]).toContain('índice 1');
  });

  it('propaga erro de infraestrutura em vez de marcar como teamNotFound/ambiguous', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Manchester United', ['team-1']]]),
    );
    (teamsRepository.upsertAlias as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED: banco indisponível'),
    );

    const buffer = buildFileBuffer([buildRawEntry()]);

    await expect(useCase.execute(buffer)).rejects.toThrow('ECONNREFUSED');
  });
});
