import { TeamsRepository } from '../../../teams/teams.repository';
import { ImportTeamFormationsUseCase } from '../import-team-formations.use-case';

const buildRawRow = (overrides: Record<string, unknown> = {}) => ({
  time: 'Ajax',
  formacao: '4-3-3 Em linha',
  ...overrides,
});

const buildFileBuffer = (rows: unknown[]): Buffer =>
  Buffer.from(JSON.stringify(rows));

const buildUseCase = () => {
  const teamsRepository = {
    findIdsByNames: jest.fn().mockResolvedValue(new Map<string, string[]>()),
    update: jest.fn().mockResolvedValue(undefined),
  } as unknown as TeamsRepository;

  const useCase = new ImportTeamFormationsUseCase(teamsRepository);

  return { useCase, teamsRepository };
};

describe('ImportTeamFormationsUseCase', () => {
  it('atualiza a formação quando o nome bate com exatamente um time', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Ajax', ['team-1']]]),
    );

    const buffer = buildFileBuffer([buildRawRow()]);
    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.notFound).toHaveLength(0);
    expect(summary.ambiguous).toHaveLength(0);
    expect(teamsRepository.update).toHaveBeenCalledWith(
      'team-1',
      expect.objectContaining({ formation: expect.any(String) }),
    );
  });

  it('marca como notFound quando nenhum time bate com o nome', async () => {
    const { useCase, teamsRepository } = buildUseCase();

    const buffer = buildFileBuffer([buildRawRow({ time: 'Time Inexistente' })]);
    const summary = await useCase.execute(buffer);

    expect(summary.notFound).toEqual(['Time Inexistente']);
    expect(summary.updated).toBe(0);
    expect(teamsRepository.update).not.toHaveBeenCalled();
  });

  it('marca como ambiguous quando mais de um time bate com o nome', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Nacional', ['team-1', 'team-2']]]),
    );

    const buffer = buildFileBuffer([buildRawRow({ time: 'Nacional' })]);
    const summary = await useCase.execute(buffer);

    expect(summary.ambiguous).toEqual(['Nacional']);
    expect(summary.updated).toBe(0);
    expect(teamsRepository.update).not.toHaveBeenCalled();
  });

  it('não derruba o import quando um item do JSON não bate com o schema', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Ajax', ['team-1']]]),
    );

    const buffer = buildFileBuffer([
      buildRawRow(),
      { time: 'Time Sem Formação Válida', formacao: 'Formação Inexistente' },
    ]);

    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.invalid).toHaveLength(1);
    expect(summary.invalid[0]).toContain('índice 1');
  });

  it('propaga erro de infraestrutura em vez de marcar como notFound/ambiguous', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByNames as jest.Mock).mockResolvedValue(
      new Map([['Ajax', ['team-1']]]),
    );
    (teamsRepository.update as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED: banco indisponível'),
    );

    const buffer = buildFileBuffer([buildRawRow()]);

    await expect(useCase.execute(buffer)).rejects.toThrow('ECONNREFUSED');
  });
});
