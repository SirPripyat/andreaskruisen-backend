import { LeaguesRepository } from '../../../leagues/leagues.repository';
import { NationalitiesRepository } from '../../../nationalities/nationalities.repository';
import { PlayersRepository } from '../../../players/players.repository';
import { PlayerImportSnapshot } from '../../../players/types';
import { SpecialitiesRepository } from '../../../specialities/specialities.repository';
import { TeamsRepository } from '../../../teams/teams.repository';
import { ImportPlayersUseCase } from '../import-players.use-case';

const MINIMAL_STATS = {
  acceleration: 67,
  agility: 78,
  jumping: 70,
  stamina: 83,
  strength: 71,
  aggression: 44,
  balance: 82,
  ballControl: 86,
  composure: 85,
  crossing: 78,
  curve: 82,
  defensiveAwareness: 49,
  dribbling: 84,
  finishing: 76,
  freeKickAccuracy: 78,
  gkDiving: 11,
  gkHandling: 16,
  gkKicking: 11,
  gkPositioning: 8,
  gkReflexes: 9,
  headingAccuracy: 57,
  interceptions: 54,
  longPassing: 83,
  longShots: 76,
  penalties: 55,
  positioning: 82,
  reactions: 82,
  shortPassing: 85,
  shotPower: 82,
  slidingTackle: 39,
  sprintSpeed: 71,
  standingTackle: 32,
  vision: 86,
  volleys: 85,
};

// Preenchidos (em vez de ausentes, como em MINIMAL_STATS) pra comparar
// número com número nos testes de dedup do rating — se faltassem de um lado
// e fossem `null` do outro (caso real de uma linha já gravada quando o
// scraper não envia esses agregados), a comparação nunca bateria por
// null !== undefined. Isso é uma divergência pré-existente de
// overallsEqual/mapOverall, fora do escopo do que esses testes cobrem.
const FULL_STATS = {
  ...MINIMAL_STATS,
  pac: 69,
  sho: 77,
  pas: 83,
  dri: 84,
  def: 45,
  phy: 69,
};

const buildRawPlayer = (overrides: Record<string, unknown> = {}) => ({
  id: 212194,
  name: 'Julian Brandt',
  photoUrl: 'https://example.com/photo.png',
  team: 'Ajax',
  teamCrestUrl: 'https://example.com/crest.png',
  nationality: 'Alemanha',
  nationalityFlagUrl: 'https://example.com/flag.png',
  league: 'Eredivisie',
  birthdate: '1996-05-02',
  preferredFoot: 'Destro',
  skillMoves: 4,
  weakFootAbility: 4,
  overallRating: 82,
  positionShort: 'MEI',
  alternatePositions: ['MC', 'VOL'],
  specialities: ['Matador'],
  roles: [{ position: 'MEI', name: 'Meia Avançado', level: 1 }],
  positionRatings: {
    MEI: { overall: 82, base: 81, bonus: 1, natural: true },
  },
  stats: MINIMAL_STATS,
  ...overrides,
});

const buildFileBuffer = (players: unknown[]): Buffer =>
  Buffer.from(JSON.stringify(players));

const buildUseCase = () => {
  const playersRepository = {
    upsertByEaId: jest.fn().mockResolvedValue({ id: 'db-player-1' }),
    replacePositions: jest.fn().mockResolvedValue(undefined),
    createRating: jest.fn().mockResolvedValue(undefined),
    findImportSnapshotsByEaIds: jest
      .fn()
      .mockResolvedValue(new Map<number, PlayerImportSnapshot>()),
  } as unknown as PlayersRepository;

  const teamsRepository = {
    upsertByNameAndLeague: jest.fn().mockResolvedValue({ id: 'team-1' }),
  } as unknown as TeamsRepository;

  const leaguesRepository = {
    upsertByName: jest.fn().mockResolvedValue({ id: 'league-1' }),
  } as unknown as LeaguesRepository;

  const nationalitiesRepository = {
    upsertByName: jest.fn().mockResolvedValue({ id: 'nationality-1' }),
  } as unknown as NationalitiesRepository;

  const specialitiesRepository = {
    upsertByName: jest
      .fn()
      .mockImplementation((name: string) =>
        Promise.resolve({ id: `speciality-${name}` }),
      ),
  } as unknown as SpecialitiesRepository;

  const useCase = new ImportPlayersUseCase(
    playersRepository,
    teamsRepository,
    leaguesRepository,
    nationalitiesRepository,
    specialitiesRepository,
  );

  return {
    useCase,
    playersRepository,
    teamsRepository,
    leaguesRepository,
    nationalitiesRepository,
    specialitiesRepository,
  };
};

const CAPTURED_AT = new Date('2026-01-01T00:00:00.000Z');

describe('ImportPlayersUseCase', () => {
  it('conta jogador de seleção nacional como skipped, sem tentar importar', async () => {
    const { useCase, playersRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawPlayer({ team: 'Brazil', league: 'International' }),
    ]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.skipped).toBe(1);
    expect(summary.processed).toBe(0);
    expect(summary.failed).toHaveLength(0);
    expect(playersRepository.upsertByEaId).not.toHaveBeenCalled();
  });

  it('conta jogador do Brasileirão como skipped, sem tentar importar (fonte exclusiva do FC Squad Mania)', async () => {
    const { useCase, playersRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawPlayer({
        team: 'Flamengo',
        league: 'Brasileirão Betano Série A',
      }),
    ]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.skipped).toBe(1);
    expect(summary.processed).toBe(0);
    expect(summary.failed).toHaveLength(0);
    expect(playersRepository.upsertByEaId).not.toHaveBeenCalled();
  });

  it('coloca em failed o jogador cuja dimensão não resolveu, sem derrubar os demais', async () => {
    const { useCase, playersRepository, nationalitiesRepository } =
      buildUseCase();
    (nationalitiesRepository.upsertByName as jest.Mock).mockImplementation(
      (name: string) =>
        Promise.resolve({
          id: name === 'Nacionalidade Sem Resolver' ? undefined : 'nat-1',
        }),
    );

    const buffer = buildFileBuffer([
      buildRawPlayer({ id: 1, name: 'Jogador OK' }),
      buildRawPlayer({
        id: 2,
        name: 'Jogador Sem Dimensão',
        nationality: 'Nacionalidade Sem Resolver',
      }),
    ]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.processed).toBe(1);
    expect(summary.failed).toHaveLength(1);
    expect(summary.failed[0]).toMatchObject({
      eaId: 2,
      name: 'Jogador Sem Dimensão',
    });
    expect(playersRepository.upsertByEaId).toHaveBeenCalledTimes(1);
  });

  it('propaga erro de infraestrutura em vez de colocar em failed', async () => {
    const { useCase, playersRepository } = buildUseCase();
    (playersRepository.upsertByEaId as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED: banco indisponível'),
    );

    const buffer = buildFileBuffer([buildRawPlayer()]);

    await expect(useCase.execute(buffer, CAPTURED_AT)).rejects.toThrow(
      'ECONNREFUSED',
    );
  });

  it('não derruba o import quando um item do JSON não bate com o schema de jogador', async () => {
    const { useCase } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawPlayer({ id: 1, name: 'Jogador Válido' }),
      // overallRating como string: inválido pro ScraperPlayerSchema.
      buildRawPlayer({
        id: 2,
        name: 'Jogador Inválido',
        overallRating: 'alta',
      }),
    ]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.processed).toBe(1);
    expect(summary.failed).toHaveLength(1);
    expect(summary.failed[0].name).toBe('Jogador Inválido');
  });

  it('não reinsere rating quando o rating mais recente é igual ao calculado', async () => {
    const { useCase, playersRepository } = buildUseCase();
    const existingSnapshot: PlayerImportSnapshot = {
      positions: [
        { position: 'MEI', isPrimary: true },
        { position: 'MC', isPrimary: false },
        { position: 'VOL', isPrimary: false },
      ],
      latestRating: {
        id: 'rating-1',
        playerId: 'db-player-1',
        capturedAt: new Date('2025-01-01T00:00:00.000Z'),
        overallRating: 82,
        skillMoves: 4,
        weakFootAbility: 4,
        ...FULL_STATS,
        specialities: ['Matador'],
        roles: [{ position: 'MEI', name: 'Meia Avançado', level: 1 }],
        positionRatings: [
          { position: 'MEI', overall: 82, base: 81, bonus: 1, natural: true },
        ],
      },
    };
    (
      playersRepository.findImportSnapshotsByEaIds as jest.Mock
    ).mockResolvedValue(new Map([[212194, existingSnapshot]]));

    const buffer = buildFileBuffer([buildRawPlayer({ stats: FULL_STATS })]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.ratingsInserted).toBe(0);
    expect(playersRepository.createRating).not.toHaveBeenCalled();
    expect(playersRepository.replacePositions).not.toHaveBeenCalled();
  });

  it('reinsere rating quando overall bate mas specialities/roles/positionRatings divergem (ex.: rating gravado antes desses campos existirem)', async () => {
    const { useCase, playersRepository } = buildUseCase();
    const existingSnapshot: PlayerImportSnapshot = {
      positions: [
        { position: 'MEI', isPrimary: true },
        { position: 'MC', isPrimary: false },
        { position: 'VOL', isPrimary: false },
      ],
      latestRating: {
        id: 'rating-1',
        playerId: 'db-player-1',
        capturedAt: new Date('2025-01-01T00:00:00.000Z'),
        overallRating: 82,
        skillMoves: 4,
        weakFootAbility: 4,
        ...FULL_STATS,
        specialities: [],
        roles: [],
        positionRatings: [],
      },
    };
    (
      playersRepository.findImportSnapshotsByEaIds as jest.Mock
    ).mockResolvedValue(new Map([[212194, existingSnapshot]]));

    const buffer = buildFileBuffer([buildRawPlayer({ stats: FULL_STATS })]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.ratingsInserted).toBe(1);
    expect(playersRepository.createRating).toHaveBeenCalledWith(
      'db-player-1',
      expect.objectContaining({ capturedAt: CAPTURED_AT }),
      ['speciality-Matador'],
      [{ position: 'MEI', name: 'Meia Avançado', level: 1 }],
      [{ position: 'MEI', overall: 82, base: 81, bonus: 1, natural: true }],
    );
  });

  it('resolve specialities e envia roles/positionRatings ao criar o rating', async () => {
    const { useCase, playersRepository } = buildUseCase();

    const buffer = buildFileBuffer([buildRawPlayer()]);

    await useCase.execute(buffer, CAPTURED_AT);

    expect(playersRepository.createRating).toHaveBeenCalledWith(
      'db-player-1',
      expect.objectContaining({ capturedAt: CAPTURED_AT }),
      ['speciality-Matador'],
      [{ position: 'MEI', name: 'Meia Avançado', level: 1 }],
      [{ position: 'MEI', overall: 82, base: 81, bonus: 1, natural: true }],
    );
  });
});
