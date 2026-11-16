import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Tournament } from '../../../generated/prisma/client';
import { RulesetPrizeTable } from '../../rulesets/schemas';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { TournamentsRepository } from '../tournaments.repository';
import { GeneratedKnockoutMatch, PhaseSummary } from '../types';
import { computeMatchScore, knockoutRoundName, rankingReward } from '../utils';
import { AwardTournamentPrizeUseCase } from './award-tournament-prize.use-case';
import { BuildGroupStandingsUseCase } from './build-group-standings.use-case';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class AdvancePhaseUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
    private readonly awardTournamentPrizeUseCase: AwardTournamentPrizeUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  @Transactional()
  async execute(tournamentId: string, phaseId: string): Promise<void> {
    const tournament =
      await this.findTournamentOrThrowUseCase.execute(tournamentId);

    const phase = await this.tournamentsRepository.findPhaseForTournament(
      tournamentId,
      phaseId,
    );

    if (!phase) throw new NotFoundException('Fase não encontrada');

    const latestPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);

    if (latestPhase?.id !== phase.id) {
      throw new ConflictException(
        'Só é possível avançar a partir da fase atual do torneio',
      );
    }

    const unplayedCount =
      await this.tournamentsRepository.countUnplayedMatches(phaseId);

    if (unplayedCount > 0) {
      throw new ConflictException('Ainda há partida sem resultado nesta fase');
    }

    const { prizes } = await this.getActiveRulesetUseCase.execute(
      tournament.seasonId,
    );

    if (phase.type === 'GROUP') {
      await this.advanceFromGroupStage(tournament, phase, prizes);
      return;
    }

    await this.advanceKnockoutRound(tournament, phase, prizes);
  }

  private async advanceFromGroupStage(
    tournament: Tournament,
    phase: PhaseSummary,
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    if (tournament.format !== 'GROUP_STAGE_KNOCKOUT')
      throw new ConflictException('Este torneio não tem fase de mata-mata');

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      phase.id,
    );

    const standingsByGroup =
      await this.buildGroupStandingsUseCase.execute(groupMatches);

    const groupLabels = Object.keys(standingsByGroup).sort();

    const firstPlaced = groupLabels.map((label) => standingsByGroup[label][0]);
    const secondPlaced = groupLabels.map((label) => standingsByGroup[label][1]);

    await this.awardGroupPositionPrizes(
      tournament.seasonId,
      phase.id,
      standingsByGroup,
      prizes.groupPositionAmounts,
    );
    await this.awardPhaseAdvancePrizes(
      tournament.seasonId,
      phase.id,
      [...firstPlaced, ...secondPlaced].map((standing) => standing.teamId),
      prizes.phaseAdvance,
    );

    const matches = firstPlaced.map((first, i) => ({
      homeTeamId: first.teamId,
      awayTeamId: secondPlaced[(i + 1) % secondPlaced.length].teamId,
    }));

    await this.createNextKnockoutPhase(tournament.id, phase.order, matches);
  }

  private async advanceKnockoutRound(
    tournament: Tournament,
    phase: PhaseSummary,
    prizes: RulesetPrizeTable,
  ): Promise<void> {
    const matches = await this.tournamentsRepository.findMatchesByPhase(
      phase.id,
    );

    if (matches.length <= 1)
      throw new ConflictException('Esta já é a fase final do torneio');

    const winnerTeamIds: string[] = [];

    for (const match of matches) {
      const score = computeMatchScore(
        match.homeTeam.id,
        match.awayTeam.id,
        match.goalScorerTeamIds,
      );

      if (score.homeGoals === score.awayGoals) {
        if (!match.penalties)
          throw new ConflictException(
            'Existe partida empatada nesta fase sem pênaltis definidos; corrija o resultado antes de avançar',
          );

        winnerTeamIds.push(match.penalties.winnerTeamId);
        continue;
      }

      winnerTeamIds.push(
        score.homeGoals > score.awayGoals
          ? match.homeTeam.id
          : match.awayTeam.id,
      );
    }

    await this.awardPhaseAdvancePrizes(
      tournament.seasonId,
      phase.id,
      winnerTeamIds,
      prizes.phaseAdvance,
    );

    const nextMatches: GeneratedKnockoutMatch[] = [];

    for (let i = 0; i < winnerTeamIds.length; i += 2)
      nextMatches.push({
        homeTeamId: winnerTeamIds[i],
        awayTeamId: winnerTeamIds[i + 1],
      });

    await this.createNextKnockoutPhase(tournament.id, phase.order, nextMatches);
  }

  // Prêmio de posição final na fase de grupos (1º/2º/3º/4º.../ver
  // rankingReward) — todo time do grupo, não só quem avança.
  private async awardGroupPositionPrizes(
    seasonId: string,
    phaseId: string,
    standingsByGroup: Record<string, { teamId: string; position: number }[]>,
    groupPositionAmounts: number[],
  ): Promise<void> {
    const allStandings = Object.values(standingsByGroup).flat();
    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        allStandings.map((standing) => standing.teamId),
        seasonId,
      );

    for (const standing of allStandings) {
      const squadId = squadIdByTeamId.get(standing.teamId);
      if (!squadId) continue;

      await this.awardTournamentPrizeUseCase.execute({
        squadId,
        type: 'RANKING',
        targetAmount: rankingReward(standing.position, groupPositionAmounts),
        phaseId,
      });
    }
  }

  // Prêmio de avanço de fase (mata-mata) — só os times que avançam pra
  // próxima fase (qualificados do grupo, ou vencedores da rodada atual).
  private async awardPhaseAdvancePrizes(
    seasonId: string,
    phaseId: string,
    advancingTeamIds: string[],
    phaseAdvanceAmount: number,
  ): Promise<void> {
    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        advancingTeamIds,
        seasonId,
      );

    for (const teamId of advancingTeamIds) {
      const squadId = squadIdByTeamId.get(teamId);
      if (!squadId) continue;

      await this.awardTournamentPrizeUseCase.execute({
        squadId,
        type: 'PRIZE_PHASE',
        targetAmount: phaseAdvanceAmount,
        phaseId,
      });
    }
  }

  private async createNextKnockoutPhase(
    tournamentId: string,
    currentOrder: number,
    matches: GeneratedKnockoutMatch[],
  ): Promise<void> {
    const nextOrder = currentOrder + 1;

    await this.tournamentsRepository.createPhaseWithMatches({
      tournamentId,
      type: 'KNOCKOUT',
      order: nextOrder,
      name: knockoutRoundName(matches.length * 2, nextOrder),
      matches,
    });
  }
}
