import { TeamsRepository } from '../../../teams/teams.repository';
import { TeamCrestDimension } from '../../../teams/types';
import { ImportTeamCrestsUseCase } from '../import-team-crests.use-case';

const buildRawCrest = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ajax',
  logo: 'https://example.com/crest.png',
  gender: 'Futebol Masculino',
  leagues: ['Eredivisie'],
  ...overrides,
});

const buildFileBuffer = (crests: unknown[]): Buffer =>
  Buffer.from(JSON.stringify(crests));

const buildUseCase = () => {
  const teamsRepository = {
    findCrestDimensionsByNames: jest
      .fn()
      .mockResolvedValue(new Map<string, TeamCrestDimension[]>()),
    findIdsByAliases: jest.fn().mockResolvedValue(new Map<string, string>()),
    update: jest.fn().mockResolvedValue(undefined),
  } as unknown as TeamsRepository;

  const useCase = new ImportTeamCrestsUseCase(teamsRepository);

  return { useCase, teamsRepository };
};

describe('ImportTeamCrestsUseCase', () => {
  it('atualiza o escudo quando o nome bate com exatamente um time', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findCrestDimensionsByNames as jest.Mock).mockResolvedValue(
      new Map([['Ajax', [{ id: 'team-1', leagueName: 'Eredivisie' }]]]),
    );

    const buffer = buildFileBuffer([buildRawCrest()]);
    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.notFound).toHaveLength(0);
    expect(summary.ambiguous).toHaveLength(0);
    expect(teamsRepository.update).toHaveBeenCalledWith('team-1', {
      crestUrl: 'https://example.com/crest.png',
    });
  });

  it('conta como skippedFeminino sem tentar resolver o time', async () => {
    const { useCase, teamsRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawCrest({ gender: 'Futebol Feminino' }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.skippedFeminino).toBe(1);
    expect(summary.updated).toBe(0);
    expect(teamsRepository.findCrestDimensionsByNames).toHaveBeenCalledWith([]);
    expect(teamsRepository.update).not.toHaveBeenCalled();
  });

  it('desempata por liga quando o nome bate com mais de um time', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findCrestDimensionsByNames as jest.Mock).mockResolvedValue(
      new Map([
        [
          'Nacional',
          [
            { id: 'team-pt', leagueName: 'Primeira Liga' },
            { id: 'team-uy', leagueName: 'Primera División' },
          ],
        ],
      ]),
    );

    const buffer = buildFileBuffer([
      buildRawCrest({ name: 'Nacional', leagues: ['primeira liga'] }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(teamsRepository.update).toHaveBeenCalledWith('team-pt', {
      crestUrl: 'https://example.com/crest.png',
    });
  });

  it('marca como ambiguous quando a liga não desempata o nome repetido', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findCrestDimensionsByNames as jest.Mock).mockResolvedValue(
      new Map([
        [
          'Nacional',
          [
            { id: 'team-pt', leagueName: 'Primeira Liga' },
            { id: 'team-uy', leagueName: 'Primera División' },
          ],
        ],
      ]),
    );

    const buffer = buildFileBuffer([
      buildRawCrest({
        name: 'Nacional',
        leagues: ['Primeira Liga', 'Primera División'],
      }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.ambiguous).toEqual(['Nacional']);
    expect(summary.updated).toBe(0);
    expect(teamsRepository.update).not.toHaveBeenCalled();
  });

  it('resolve pelo TeamAlias quando o nome não bate com nenhum time', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findIdsByAliases as jest.Mock).mockResolvedValue(
      new Map([['PSG', 'team-psg']]),
    );

    const buffer = buildFileBuffer([buildRawCrest({ name: 'PSG' })]);
    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.notFound).toHaveLength(0);
    expect(teamsRepository.update).toHaveBeenCalledWith('team-psg', {
      crestUrl: 'https://example.com/crest.png',
    });
  });

  it('marca como notFound quando nem o nome nem o alias resolvem o time', async () => {
    const { useCase, teamsRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawCrest({ name: 'Time Inexistente' }),
    ]);
    const summary = await useCase.execute(buffer);

    expect(summary.notFound).toEqual(['Time Inexistente']);
    expect(summary.updated).toBe(0);
    expect(teamsRepository.update).not.toHaveBeenCalled();
  });

  it('não derruba o import quando um item do JSON não bate com o schema', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findCrestDimensionsByNames as jest.Mock).mockResolvedValue(
      new Map([['Ajax', [{ id: 'team-1', leagueName: 'Eredivisie' }]]]),
    );

    const buffer = buildFileBuffer([
      buildRawCrest(),
      { name: 'Time Sem Logo', gender: 'Futebol Masculino', leagues: ['x'] },
    ]);

    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.invalid).toHaveLength(1);
    expect(summary.invalid[0]).toContain('índice 1');
  });

  it('propaga erro de infraestrutura em vez de marcar como notFound/ambiguous', async () => {
    const { useCase, teamsRepository } = buildUseCase();
    (teamsRepository.findCrestDimensionsByNames as jest.Mock).mockResolvedValue(
      new Map([['Ajax', [{ id: 'team-1', leagueName: 'Eredivisie' }]]]),
    );
    (teamsRepository.update as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED: banco indisponível'),
    );

    const buffer = buildFileBuffer([buildRawCrest()]);

    await expect(useCase.execute(buffer)).rejects.toThrow('ECONNREFUSED');
  });
});
