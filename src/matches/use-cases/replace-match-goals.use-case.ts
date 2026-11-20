import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { PhaseType } from 'generated/prisma/client';
import { RulesetPrizeTable } from '../../rulesets/schemas';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { TournamentsRepository } from '../../tournaments/tournaments.repository';
import { MatchPenalties } from '../../tournaments/types';
import {
  AwardTournamentPrizeUseCase,
  BuildGroupStandingsUseCase,
} from '../../tournaments/use-cases';
import {
  determineChampionTeamId,
  determineRunnerUpTeamId,
  matchResultRewardByTeam,
  rankingReward,
} from '../../tournaments/utils';
import { ReplaceMatchGoalsRequestDTO } from '../dto/request';
import { MatchesRepository } from '../matches.repository';
import { Goal, MatchDetailResponse, MatchForGoals } from '../types';
import { countGoalsByTeam } from '../utils';
import { GetMatchDetailUseCase } from './get-match-detail.use-case';

@Injectable()
export class ReplaceMatchGoalsUseCase {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly getMatchDetailUseCase: GetMatchDetailUseCase,
    private readonly awardTournamentPrizeUseCase: AwardTournamentPrizeUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  @Transactional()
  async execute(
    matchId: string,
    dto: ReplaceMatchGoalsRequestDTO,
  ): Promise<MatchDetailResponse> {
    const match = await this.matchesRepository.findMatchForGoals(matchId);
    if (!match) throw new NotFoundException('Partida não encontrada');

    const locked = await this.tournamentsRepository.hasLaterPhase(
      match.tournamentId,
      match.phaseOrder,
    );

    if (locked)
      throw new ConflictException(
        'Partida travada: a fase seguinte já foi gerada a partir dela',
      );

    const playerIds = [
      ...new Set(
        dto.goals.flatMap((goal) =>
          goal.assistId ? [goal.scorerId, goal.assistId] : [goal.scorerId],
        ),
      ),
    ];

    const assignments =
      await this.matchesRepository.findAssignedTeamsByPlayerIds(
        match.seasonId,
        playerIds,
      );

    const teamIdByPlayerId = new Map(
      assignments.map((assignment) => [assignment.playerId, assignment.teamId]),
    );

    const matchTeamIds = new Set([match.homeTeamId, match.awayTeamId]);

    const goals: Goal[] = [];

    for (const goal of dto.goals) {
      const scorerTeamId = teamIdByPlayerId.get(goal.scorerId);

      if (!scorerTeamId || !matchTeamIds.has(scorerTeamId)) {
        throw new BadRequestException(
          'Artilheiro precisa ser de um dos times da partida',
        );
      }

      if (
        goal.assistId &&
        teamIdByPlayerId.get(goal.assistId) !== scorerTeamId
      ) {
        throw new BadRequestException(
          'Assistência precisa ser do mesmo time do artilheiro',
        );
      }

      goals.push({
        scorerId: goal.scorerId,
        assistId: goal.assistId ?? null,
        teamId: scorerTeamId,
      });
    }

    const { homeGoals, awayGoals } = countGoalsByTeam(goals, match.homeTeamId);

    const penalties = this.resolveManualPenalties(
      match.phaseType,
      match.homeTeamId,
      match.awayTeamId,
      homeGoals,
      awayGoals,
      dto.penalties,
    );

    await this.matchesRepository.replaceMatchGoals(matchId, goals, penalties);

    const { prizes } = await this.getActiveRulesetUseCase.execute(
      match.seasonId,
    );

    await this.awardMatchResultPrizes(
      match,
      homeGoals,
      awayGoals,
      penalties,
      prizes,
    );
    await this.awardTerminalPrizesIfTournamentJustFinished(match, prizes);

    return this.getMatchDetailUseCase.execute(matchId);
  }

  // Prêmio de resultado (WIN/DRAW/LOSS) — toda partida, de qualquer
  // formato/fase, sempre que o placar é fixado (ou corrigido).
  private async awardMatchResultPrizes(
    match: MatchForGoals,
    homeGoals: number,
    awayGoals: number,
    penalties: MatchPenalties | null,
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    const rewardByTeamId = matchResultRewardByTeam(
      {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeGoals,
        awayGoals,
        penaltyWinnerTeamId: penalties?.winnerTeamId ?? null,
      },
      prizes.matchResult,
    );

    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        [match.homeTeamId, match.awayTeamId],
        match.seasonId,
      );

    for (const [teamId, prize] of Object.entries(rewardByTeamId)) {
      const squadId = squadIdByTeamId.get(teamId);
      if (!squadId) continue;

      await this.awardTournamentPrizeUseCase.execute({
        seasonId: match.seasonId,
        squadId,
        type: prize.type,
        targetAmount: prize.amount,
        matchId: match.id,
      });
    }
  }

  // Prêmio de posição + campeão/vice de uma LEAGUE, e campeão/vice da final
  // de um mata-mata (KNOCKOUT ou reta final de GROUP_STAGE_KNOCKOUT) — só
  // quando essa partida acabou de completar a fase decisiva. Reaproveita a
  // mesma condição de "torneio terminado" de HasActiveTournamentUseCase.
  // match.phaseId já é garantido ser a fase mais recente aqui: uma partida
  // de fase anterior já teria sido rejeitada por `locked`, no início de
  // execute().
  private async awardTerminalPrizesIfTournamentJustFinished(
    match: MatchForGoals,
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    const unplayedCount = await this.tournamentsRepository.countUnplayedMatches(
      match.phaseId,
    );
    if (unplayedCount > 0) return;

    if (match.tournamentFormat === 'LEAGUE') {
      await this.awardLeaguePrizes(match, prizes);
      return;
    }

    if (match.phaseType !== 'KNOCKOUT') return;

    const matchCount = await this.tournamentsRepository.countMatches(
      match.phaseId,
    );
    if (matchCount !== 1) return;

    await this.awardKnockoutFinalPrizes(match, prizes);
  }

  private async awardLeaguePrizes(
    match: MatchForGoals,
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      match.phaseId,
    );
    const standingsByGroup =
      await this.buildGroupStandingsUseCase.execute(groupMatches);

    const standings = Object.values(standingsByGroup).flat();
    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        standings.map((standing) => standing.teamId),
        match.seasonId,
      );

    for (const standing of standings) {
      const squadId = squadIdByTeamId.get(standing.teamId);
      if (!squadId) continue;

      await this.awardTournamentPrizeUseCase.execute({
        seasonId: match.seasonId,
        squadId,
        type: 'RANKING',
        targetAmount: rankingReward(
          standing.position,
          prizes.groupPositionAmounts,
        ),
        phaseId: match.phaseId,
      });
    }

    const championInput = {
      format: match.tournamentFormat,
      isLatestPhaseFullyPlayed: true,
      latestPhaseType: 'GROUP' as const,
      standingsByGroup,
    };

    await this.awardChampionAndRunnerUp(
      match.seasonId,
      championInput,
      squadIdByTeamId,
      { phaseId: match.phaseId },
      prizes,
    );
  }

  private async awardKnockoutFinalPrizes(
    match: MatchForGoals,
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    const matches = await this.tournamentsRepository.findMatchesByPhase(
      match.phaseId,
    );

    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        [match.homeTeamId, match.awayTeamId],
        match.seasonId,
      );

    const championInput = {
      format: match.tournamentFormat,
      isLatestPhaseFullyPlayed: true,
      latestPhaseType: 'KNOCKOUT' as const,
      knockoutMatches: matches.map((knockoutMatch) => ({
        homeTeamId: knockoutMatch.homeTeam.id,
        awayTeamId: knockoutMatch.awayTeam.id,
        goalScorerTeamIds: knockoutMatch.goalScorerTeamIds,
        penaltyWinnerTeamId: knockoutMatch.penalties?.winnerTeamId ?? null,
      })),
    };

    await this.awardChampionAndRunnerUp(
      match.seasonId,
      championInput,
      squadIdByTeamId,
      { matchId: match.id },
      prizes,
    );
  }

  private async awardChampionAndRunnerUp(
    seasonId: string,
    championInput: Parameters<typeof determineChampionTeamId>[0],
    squadIdByTeamId: Map<string, string>,
    link: { matchId: string } | { phaseId: string },
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    const championTeamId = determineChampionTeamId(championInput);
    const runnerUpTeamId = determineRunnerUpTeamId(championInput);

    const championSquadId = championTeamId
      ? squadIdByTeamId.get(championTeamId)
      : undefined;
    if (championSquadId) {
      await this.awardTournamentPrizeUseCase.execute({
        seasonId,
        squadId: championSquadId,
        type: 'CHAMPION',
        targetAmount: prizes.champion,
        ...link,
      });
    }

    const runnerUpSquadId = runnerUpTeamId
      ? squadIdByTeamId.get(runnerUpTeamId)
      : undefined;
    if (runnerUpSquadId) {
      await this.awardTournamentPrizeUseCase.execute({
        seasonId,
        squadId: runnerUpSquadId,
        type: 'RUNNER_UP',
        targetAmount: prizes.runnerUp,
        ...link,
      });
    }
  }

  private resolveManualPenalties(
    phaseType: PhaseType,
    homeTeamId: string,
    awayTeamId: string,
    homeGoals: number,
    awayGoals: number,
    dtoPenalties: ReplaceMatchGoalsRequestDTO['penalties'],
  ) {
    const isDrawInKnockout =
      phaseType === 'KNOCKOUT' && homeGoals === awayGoals;

    if (!isDrawInKnockout && dtoPenalties) {
      throw new BadRequestException(
        'Pênaltis só se aplicam a um empate em partida eliminatória',
      );
    }

    if (!isDrawInKnockout) return null;

    if (!dtoPenalties)
      throw new BadRequestException(
        'Partida eliminatória empatada precisa do resultado dos pênaltis',
      );

    return {
      homeScore: dtoPenalties.homeScore,
      awayScore: dtoPenalties.awayScore,
      winnerTeamId:
        dtoPenalties.homeScore > dtoPenalties.awayScore
          ? homeTeamId
          : awayTeamId,
    };
  }
}
