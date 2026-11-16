import { LeaguesRepository } from '../../../leagues/leagues.repository';
import { NationalitiesRepository } from '../../../nationalities/nationalities.repository';
import { PlayersRepository } from '../../../players/players.repository';
import { PlayerImportSnapshot } from '../../../players/types';
import { SpecialitiesRepository } from '../../../specialities/specialities.repository';
import { TeamsRepository } from '../../../teams/teams.repository';
import { ImportFcmPlayersUseCase } from '../import-fcm-players.use-case';

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

const buildRawPlayer = (overrides: Record<string, unknown> = {}) => ({
  id: 225645,
  name: 'Giorgian De Arrascaeta',
  photoUrl:
    'https://patchfcm.fcmania.com.br/imagens/fcm27/jogadores/p225645.webp',
  team: 'Flamengo',
  teamCrestUrl:
    'https://patchfcm.fcmania.com.br/imagens/fcm27/escudos/l1043.webp',
  nationality: 'Uruguai',
  nationalityFlagUrl: 'https://example.com/flag.png',
  league: 'Brasileirão Betano Série A',
  birthdate: '1994-06-01',
  preferredFoot: 'Destro',
  skillMoves: 3,
  weakFootAbility: 4,
  overallRating: 84,
  positionShort: 'MEI',
  alternatePositions: ['MC', 'ME', 'ATA'],
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
    upsertByName: jest.fn().mockResolvedValue({ id: 'speciality-1' }),
  } as unknown as SpecialitiesRepository;

  const useCase = new ImportFcmPlayersUseCase(
    playersRepository,
    teamsRepository,
    leaguesRepository,
    nationalitiesRepository,
    specialitiesRepository,
  );

  return { useCase, playersRepository };
};

const CAPTURED_AT = new Date('2026-01-01T00:00:00.000Z');

describe('ImportFcmPlayersUseCase', () => {
  it('importa jogador do Brasileirão usando a photoUrl do próprio JSON, sem reconstruir via eaId', async () => {
    const { useCase, playersRepository } = buildUseCase();

    const buffer = buildFileBuffer([buildRawPlayer()]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.processed).toBe(1);
    expect(playersRepository.upsertByEaId).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUrl:
          'https://patchfcm.fcmania.com.br/imagens/fcm27/jogadores/p225645.webp',
      }),
    );
  });

  it('conta como skipped jogador de qualquer liga que não seja o Brasileirão', async () => {
    const { useCase, playersRepository } = buildUseCase();

    const buffer = buildFileBuffer([
      buildRawPlayer({ team: 'Ajax', league: 'Eredivisie' }),
    ]);

    const summary = await useCase.execute(buffer, CAPTURED_AT);

    expect(summary.skipped).toBe(1);
    expect(summary.processed).toBe(0);
    expect(playersRepository.upsertByEaId).not.toHaveBeenCalled();
  });
});
