import {
  PlayersRepository,
  PlayerTeamDimension,
} from '../../../players/players.repository';
import { TeamsRepository } from '../../../teams/teams.repository';
import { ImportTeamLineupsUseCase } from '../import-team-lineups.use-case';

const buildSlot = (overrides: Record<string, unknown> = {}) => ({
  position: 'MEI',
  player: 'Julian Brandt',
  overall: 82,
  player_id: 212194,
  ...overrides,
});

const buildRawTeam = (overrides: Record<string, unknown> = {}) => ({
  team: 'Borussia Dortmund',
  short_name: 'Dortmund',
  formation: '4-2-3-1 Aberto',
  starting_xi: [buildSlot()],
  ...overrides,
});

const buildFileBuffer = (teams: unknown[]): Buffer =>
  Buffer.from(JSON.stringify({ teams }));

const buildUseCase = () => {
  const teamsRepository = {
    replaceLineup: jest.fn().mockResolvedValue(undefined),
  } as unknown as TeamsRepository;

  const playersRepository = {
    findTeamDimensionsByEaIds: jest
      .fn()
      .mockResolvedValue(new Map<number, PlayerTeamDimension>()),
  } as unknown as PlayersRepository;

  const useCase = new ImportTeamLineupsUseCase(
    teamsRepository,
    playersRepository,
  );

  return { useCase, teamsRepository, playersRepository };
};

describe('ImportTeamLineupsUseCase', () => {
  it('grava a escalação quando os titulares resolvem o time majoritário', async () => {
    const { useCase, teamsRepository, playersRepository } = buildUseCase();
    (
      playersRepository.findTeamDimensionsByEaIds as jest.Mock
    ).mockResolvedValue(
      new Map([[212194, { id: 'player-1', teamId: 'team-1' }]]),
    );

    const buffer = buildFileBuffer([buildRawTeam()]);
    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.notFound).toHaveLength(0);
    expect(teamsRepository.replaceLineup).toHaveBeenCalledWith(
      'team-1',
      expect.any(String),
      [{ playerId: 'player-1', position: 'MEI' }],
    );
  });

  it('marca como notFound quando nenhum titular bate com um Player.eaId', async () => {
    const { useCase, teamsRepository } = buildUseCase();

    const buffer = buildFileBuffer([buildRawTeam()]);
    const summary = await useCase.execute(buffer);

    expect(summary.notFound).toEqual(['Dortmund']);
    expect(summary.updated).toBe(0);
    expect(teamsRepository.replaceLineup).not.toHaveBeenCalled();
  });

  it('conta playersNotFound sem derrubar o import quando um titular não bate com nenhum Player', async () => {
    const { useCase, playersRepository } = buildUseCase();
    (
      playersRepository.findTeamDimensionsByEaIds as jest.Mock
    ).mockResolvedValue(
      new Map([[212194, { id: 'player-1', teamId: 'team-1' }]]),
    );

    const buffer = buildFileBuffer([
      buildRawTeam({
        starting_xi: [buildSlot(), buildSlot({ player_id: 999 })],
      }),
    ]);

    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.playersNotFound).toBe(1);
  });

  it('conta staleTeamSlots e não inclui o titular na escalação salva', async () => {
    const { useCase, teamsRepository, playersRepository } = buildUseCase();
    (
      playersRepository.findTeamDimensionsByEaIds as jest.Mock
    ).mockResolvedValue(
      new Map([
        [212194, { id: 'player-1', teamId: 'team-1' }],
        [111, { id: 'player-2', teamId: 'team-2' }],
      ]),
    );

    const buffer = buildFileBuffer([
      buildRawTeam({
        starting_xi: [buildSlot(), buildSlot({ player_id: 111 })],
      }),
    ]);

    const summary = await useCase.execute(buffer);

    expect(summary.staleTeamSlots).toBe(1);
    expect(teamsRepository.replaceLineup).toHaveBeenCalledWith(
      'team-1',
      expect.any(String),
      [{ playerId: 'player-1', position: 'MEI' }],
    );
  });

  it('não derruba o import quando um item do JSON não bate com o schema', async () => {
    const { useCase, playersRepository } = buildUseCase();
    (
      playersRepository.findTeamDimensionsByEaIds as jest.Mock
    ).mockResolvedValue(
      new Map([[212194, { id: 'player-1', teamId: 'team-1' }]]),
    );

    const buffer = buildFileBuffer([
      buildRawTeam(),
      { team: 'Time Sem Formação Válida', formation: 'Formação Inexistente' },
    ]);

    const summary = await useCase.execute(buffer);

    expect(summary.updated).toBe(1);
    expect(summary.invalid).toHaveLength(1);
    expect(summary.invalid[0]).toContain('índice 1');
  });

  it('propaga erro de infraestrutura em vez de marcar como notFound', async () => {
    const { useCase, teamsRepository, playersRepository } = buildUseCase();
    (
      playersRepository.findTeamDimensionsByEaIds as jest.Mock
    ).mockResolvedValue(
      new Map([[212194, { id: 'player-1', teamId: 'team-1' }]]),
    );
    (teamsRepository.replaceLineup as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED: banco indisponível'),
    );

    const buffer = buildFileBuffer([buildRawTeam()]);

    await expect(useCase.execute(buffer)).rejects.toThrow('ECONNREFUSED');
  });
});
