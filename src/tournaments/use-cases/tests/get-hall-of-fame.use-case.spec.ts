import { TournamentsRepository } from '../../tournaments.repository';
import { GoalLeader, GoalLeaderRow } from '../../types';
import { GetChampionTeamIdUseCase } from '../get-champion-team-id.use-case';
import { GetHallOfFameUseCase } from '../get-hall-of-fame.use-case';
import { ResolveGoalLeadersUseCase } from '../resolve-goal-leaders.use-case';

const scorerRow: GoalLeaderRow = {
  playerId: 'player-1',
  teamId: 'team-1',
  count: 5,
};
const assistRow: GoalLeaderRow = {
  playerId: 'player-2',
  teamId: 'team-2',
  count: 3,
};

const scorerLeader: GoalLeader = {
  player: {
    id: 'player-1',
    name: 'Dembélé',
    photoUrl: 'photo-1',
    position: 'ATA',
  },
  team: { id: 'team-1', name: 'Ajax', crestUrl: 'crest-1' },
  count: 5,
};

const assistLeader: GoalLeader = {
  player: {
    id: 'player-2',
    name: 'Brandt',
    photoUrl: 'photo-2',
    position: 'MEI',
  },
  team: { id: 'team-2', name: 'Feyenoord', crestUrl: 'crest-2' },
  count: 3,
};

// team-1 jogou 10 partidas (home 6 + away 4), team-2 jogou 4 (home só).
const playedMatchTeams = [
  { homeTeamId: 'team-1', awayTeamId: 'team-3' },
  { homeTeamId: 'team-1', awayTeamId: 'team-3' },
  { homeTeamId: 'team-1', awayTeamId: 'team-3' },
  { homeTeamId: 'team-1', awayTeamId: 'team-3' },
  { homeTeamId: 'team-1', awayTeamId: 'team-3' },
  { homeTeamId: 'team-1', awayTeamId: 'team-3' },
  { homeTeamId: 'team-3', awayTeamId: 'team-1' },
  { homeTeamId: 'team-3', awayTeamId: 'team-1' },
  { homeTeamId: 'team-3', awayTeamId: 'team-1' },
  { homeTeamId: 'team-3', awayTeamId: 'team-1' },
  { homeTeamId: 'team-2', awayTeamId: 'team-3' },
  { homeTeamId: 'team-2', awayTeamId: 'team-3' },
  { homeTeamId: 'team-2', awayTeamId: 'team-3' },
  { homeTeamId: 'team-2', awayTeamId: 'team-3' },
];

// 2 torneios encerrados: team-1 foi campeão de ambos, team-2 nenhum.
const tournamentIds = ['tournament-1', 'tournament-2'];
const latestTournamentId = 'tournament-2';

// Ranking antes do tournament-2 entrar na conta: player-1 estava em 2º
// (atrás de player-9); player-2 nem aparecia.
const previousTopScorerRows: GoalLeaderRow[] = [
  { playerId: 'player-9', teamId: 'team-9', count: 10 },
  { playerId: 'player-1', teamId: 'team-1', count: 3 },
];
const previousTopAssistRows: GoalLeaderRow[] = [];

const buildUseCase = () => {
  const tournamentsRepository = {
    findLatestFinishedTournamentIdByFormat: jest
      .fn()
      .mockResolvedValue(latestTournamentId),
    findTopScorersByFormat: jest.fn((_seasonId, _format, _limit, exclude) =>
      Promise.resolve(exclude ? previousTopScorerRows : [scorerRow]),
    ),
    findTopAssistsByFormat: jest.fn((_seasonId, _format, _limit, exclude) =>
      Promise.resolve(exclude ? previousTopAssistRows : [assistRow]),
    ),
    findPlayedMatchTeamsByFormat: jest.fn().mockResolvedValue(playedMatchTeams),
    findFinishedTournamentIdsByFormat: jest
      .fn()
      .mockResolvedValue(tournamentIds),
  } as unknown as TournamentsRepository;

  const resolveGoalLeadersUseCase = {
    execute: jest.fn((rows: GoalLeaderRow[]) =>
      Promise.resolve(
        rows[0]?.playerId === scorerRow.playerId
          ? [scorerLeader]
          : [assistLeader],
      ),
    ),
  } as unknown as ResolveGoalLeadersUseCase;

  const getChampionTeamIdUseCase = {
    execute: jest.fn().mockResolvedValue('team-1'),
  } as unknown as GetChampionTeamIdUseCase;

  const useCase = new GetHallOfFameUseCase(
    tournamentsRepository,
    resolveGoalLeadersUseCase,
    getChampionTeamIdUseCase,
  );

  return {
    useCase,
    tournamentsRepository,
    resolveGoalLeadersUseCase,
    getChampionTeamIdUseCase,
  };
};

describe('GetHallOfFameUseCase', () => {
  it('busca top 20 artilheiros/assistentes do formato dentro da temporada', async () => {
    const { useCase, tournamentsRepository } = buildUseCase();

    await useCase.execute('season-1', 'LEAGUE');

    expect(tournamentsRepository.findTopScorersByFormat).toHaveBeenCalledWith(
      'season-1',
      'LEAGUE',
      20,
    );
    expect(tournamentsRepository.findTopAssistsByFormat).toHaveBeenCalledWith(
      'season-1',
      'LEAGUE',
      20,
    );
    expect(
      tournamentsRepository.findPlayedMatchTeamsByFormat,
    ).toHaveBeenCalledWith('season-1', 'LEAGUE');
    expect(
      tournamentsRepository.findFinishedTournamentIdsByFormat,
    ).toHaveBeenCalledWith('season-1', 'LEAGUE');
  });

  it('busca o ranking anterior excluindo o último torneio encerrado', async () => {
    const { useCase, tournamentsRepository } = buildUseCase();

    await useCase.execute('season-1', 'LEAGUE');

    expect(
      tournamentsRepository.findLatestFinishedTournamentIdByFormat,
    ).toHaveBeenCalledWith('season-1', 'LEAGUE');
    expect(tournamentsRepository.findTopScorersByFormat).toHaveBeenCalledWith(
      'season-1',
      'LEAGUE',
      Number.MAX_SAFE_INTEGER,
      latestTournamentId,
    );
    expect(tournamentsRepository.findTopAssistsByFormat).toHaveBeenCalledWith(
      'season-1',
      'LEAGUE',
      Number.MAX_SAFE_INTEGER,
      latestTournamentId,
    );
  });

  it('acrescenta jogos disputados, média, títulos e variação de posição', async () => {
    const { useCase, getChampionTeamIdUseCase } = buildUseCase();

    const result = await useCase.execute('season-1', 'LEAGUE');

    expect(getChampionTeamIdUseCase.execute).toHaveBeenCalledWith(
      'tournament-1',
    );
    expect(getChampionTeamIdUseCase.execute).toHaveBeenCalledWith(
      'tournament-2',
    );
    // player-1 estava em 2º antes, agora é o 1º: subiu 1 posição.
    expect(result.topScorers).toEqual([
      {
        ...scorerLeader,
        matchesPlayed: 10,
        average: 0.5,
        titles: 2,
        positionChange: 1,
      },
    ]);
    // player-2 não aparecia no ranking anterior: estreante, positionChange null.
    expect(result.topAssists).toEqual([
      {
        ...assistLeader,
        matchesPlayed: 4,
        average: 0.75,
        titles: 0,
        positionChange: null,
      },
    ]);
  });

  it('não calcula ranking anterior quando não há torneio encerrado', async () => {
    const tournamentsRepository = {
      findLatestFinishedTournamentIdByFormat: jest.fn().mockResolvedValue(null),
      findTopScorersByFormat: jest.fn().mockResolvedValue([scorerRow]),
      findTopAssistsByFormat: jest.fn().mockResolvedValue([]),
      findPlayedMatchTeamsByFormat: jest.fn().mockResolvedValue([]),
      findFinishedTournamentIdsByFormat: jest.fn().mockResolvedValue([]),
    } as unknown as TournamentsRepository;
    const resolveGoalLeadersUseCase = {
      execute: jest.fn().mockResolvedValue([scorerLeader]),
    } as unknown as ResolveGoalLeadersUseCase;
    const getChampionTeamIdUseCase = {
      execute: jest.fn(),
    } as unknown as GetChampionTeamIdUseCase;
    const useCase = new GetHallOfFameUseCase(
      tournamentsRepository,
      resolveGoalLeadersUseCase,
      getChampionTeamIdUseCase,
    );

    const result = await useCase.execute('season-1', 'LEAGUE');

    expect(tournamentsRepository.findTopScorersByFormat).toHaveBeenCalledTimes(
      1,
    );
    expect(result.topScorers[0]).toMatchObject({
      matchesPlayed: 0,
      average: 0,
      titles: 0,
      positionChange: null,
    });
  });
});
