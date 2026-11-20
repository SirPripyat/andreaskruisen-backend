import { GetActiveRulesetUseCase } from '../../../rulesets/use-cases';
import { TournamentsRepository } from '../../../tournaments/tournaments.repository';
import {
  AwardTournamentPrizeUseCase,
  BuildGroupStandingsUseCase,
} from '../../../tournaments/use-cases';
import { GroupStanding } from '../../../tournaments/utils/group-standings.utils';
import { MatchForGoals } from '../../types';
import { AwardMatchPrizesUseCase } from '../award-match-prizes.use-case';

const prizes = {
  matchResult: { win: 3, draw: 1, loss: 0 },
  groupPositionAmounts: [10, 5],
  phaseAdvance: 0,
  champion: 20,
  runnerUp: 10,
};

const buildMatch = (overrides: Partial<MatchForGoals> = {}): MatchForGoals => ({
  id: 'match-1',
  tournamentId: 'tournament-1',
  tournamentFinishedAt: null,
  seasonId: 'season-1',
  tournamentFormat: 'LEAGUE',
  phaseId: 'phase-1',
  phaseOrder: 1,
  phaseType: 'GROUP',
  homeTeamId: 'home-team',
  awayTeamId: 'away-team',
  playedAt: null,
  ...overrides,
});

const buildStanding = (overrides: Partial<GroupStanding> = {}): GroupStanding =>
  ({
    position: 1,
    teamId: 'home-team',
    teamName: 'Home',
    teamCrestUrl: '',
    played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    goalsFor: 2,
    goalsAgainst: 0,
    goalDifference: 2,
    points: 3,
    winPercentage: 100,
    ...overrides,
  }) as GroupStanding;

const buildUseCase = (overrides: { unplayedCount: number }) => {
  const tournamentsRepository = {
    countUnplayedMatches: jest.fn().mockResolvedValue(overrides.unplayedCount),
    findGroupMatches: jest.fn().mockResolvedValue([]),
    findSquadIdsByTeamIds: jest.fn().mockResolvedValue(
      new Map([
        ['home-team', 'squad-home'],
        ['away-team', 'squad-away'],
      ]),
    ),
  } as unknown as TournamentsRepository;

  const awardTournamentPrizeUseCase = {
    execute: jest.fn(),
  } as unknown as AwardTournamentPrizeUseCase;

  const buildGroupStandingsUseCase = {
    execute: jest.fn().mockResolvedValue({
      A: [
        buildStanding({ position: 1, teamId: 'home-team' }),
        buildStanding({ position: 2, teamId: 'away-team' }),
      ],
    }),
  } as unknown as BuildGroupStandingsUseCase;

  const getActiveRulesetUseCase = {
    execute: jest.fn().mockResolvedValue({ prizes }),
  } as unknown as GetActiveRulesetUseCase;

  const useCase = new AwardMatchPrizesUseCase(
    tournamentsRepository,
    awardTournamentPrizeUseCase,
    buildGroupStandingsUseCase,
    getActiveRulesetUseCase,
  );

  return { useCase, tournamentsRepository, awardTournamentPrizeUseCase };
};

describe('AwardMatchPrizesUseCase', () => {
  it('premia WIN/LOSS da partida mesmo quando a fase ainda não terminou', async () => {
    const { useCase, awardTournamentPrizeUseCase } = buildUseCase({
      unplayedCount: 2,
    });

    await useCase.execute(buildMatch(), 2, 0, null);

    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ squadId: 'squad-home', type: 'WIN' }),
    );
    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ squadId: 'squad-away', type: 'LOSS' }),
    );
    // Fase ainda tem jogo pendente: nenhum prêmio terminal (RANKING/CHAMPION).
    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('premia RANKING e CHAMPION/RUNNER_UP quando uma LEAGUE termina', async () => {
    const { useCase, awardTournamentPrizeUseCase } = buildUseCase({
      unplayedCount: 0,
    });

    await useCase.execute(buildMatch(), 2, 0, null);

    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        squadId: 'squad-home',
        type: 'RANKING',
        targetAmount: 10,
      }),
    );
    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        squadId: 'squad-away',
        type: 'RANKING',
        targetAmount: 5,
      }),
    );
    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ squadId: 'squad-home', type: 'CHAMPION' }),
    );
    expect(awardTournamentPrizeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ squadId: 'squad-away', type: 'RUNNER_UP' }),
    );
  });
});
