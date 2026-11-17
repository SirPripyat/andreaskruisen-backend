import { Injectable } from '@nestjs/common';
import { TournamentFormat } from '../../../generated/prisma/client';
import { RulesetPrizeTable } from '../../rulesets/schemas';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { TournamentsRepository } from '../../tournaments/tournaments.repository';
import { MatchWithTeams, PhaseSummary } from '../../tournaments/types';
import { BuildGroupStandingsUseCase } from '../../tournaments/use-cases';
import {
  computeMatchScore,
  determineChampionTeamId,
  determineRunnerUpTeamId,
  matchResultRewardByTeam,
  rankingReward,
} from '../../tournaments/utils';
import { AuditFinding } from '../types';

// Recalcula, pra cada torneio da season, os mesmos prêmios que
// AdvancePhaseUseCase/ReplaceMatchGoalsUseCase já lançaram na escrita —
// agora em modo leitura, contra o ruleset vigente na época de cada
// resultado (playedAt da partida, ou a partida/data mais recente da fase
// pros prêmios de fase) — nunca o ruleset atual.
@Injectable()
export class AuditTournamentPrizesUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  async execute(seasonId: string): Promise<AuditFinding[]> {
    const tournaments = await this.tournamentsRepository.findBySeason(seasonId);
    const findings: AuditFinding[] = [];

    for (const tournament of tournaments) {
      const phases = await this.tournamentsRepository.findPhasesByTournament(
        tournament.id,
      );
      const phaseByOrder = new Map(phases.map((phase) => [phase.order, phase]));

      for (const phase of phases) {
        const matches = await this.tournamentsRepository.findMatchesByPhase(
          phase.id,
        );
        if (matches.length === 0) continue;

        findings.push(...(await this.auditMatchResults(seasonId, matches)));

        const isFullyPlayed = matches.every((match) => match.playedAt !== null);
        if (!isFullyPlayed) continue;

        const latestPlayedAt = this.latestPlayedAt(matches);
        const nextPhase = phaseByOrder.get(phase.order + 1);

        if (phase.type === 'GROUP') {
          findings.push(
            ...(await this.auditGroupPositionAndTerminalPrizes(
              seasonId,
              tournament.format,
              phase,
              latestPlayedAt,
              nextPhase !== undefined,
            )),
          );
        }

        if (nextPhase) {
          findings.push(
            ...(await this.auditPhaseAdvance(
              seasonId,
              phase,
              nextPhase,
              latestPlayedAt,
            )),
          );
        } else if (phase.type === 'KNOCKOUT' && matches.length === 1) {
          findings.push(
            ...(await this.auditKnockoutFinal(
              seasonId,
              tournament.format,
              matches,
              latestPlayedAt,
            )),
          );
        }
      }
    }

    return findings;
  }

  private latestPlayedAt(matches: MatchWithTeams[]): Date {
    return matches.reduce<Date>(
      (latest, match) =>
        match.playedAt && match.playedAt > latest ? match.playedAt : latest,
      matches[0].playedAt as Date,
    );
  }

  // Prêmio de resultado (WIN/DRAW/LOSS) — toda partida já jogada, mesmo
  // que a fase ainda não esteja completa.
  private async auditMatchResults(
    seasonId: string,
    matches: MatchWithTeams[],
  ): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const playedMatches = matches.filter((match) => match.playedAt !== null);
    if (playedMatches.length === 0) return findings;

    const teamIds = [
      ...new Set(
        playedMatches.flatMap((match) => [
          match.homeTeam.id,
          match.awayTeam.id,
        ]),
      ),
    ];
    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(teamIds, seasonId);

    for (const match of playedMatches) {
      const score = computeMatchScore(
        match.homeTeam.id,
        match.awayTeam.id,
        match.goalScorerTeamIds,
      );
      const { prizes } = await this.getActiveRulesetUseCase.execute(
        seasonId,
        match.playedAt as Date,
      );
      const rewardByTeamId = matchResultRewardByTeam(
        {
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          homeGoals: score.homeGoals,
          awayGoals: score.awayGoals,
          penaltyWinnerTeamId: match.penalties?.winnerTeamId ?? null,
        },
        prizes.matchResult,
      );

      for (const [teamId, prize] of Object.entries(rewardByTeamId)) {
        const squadId = squadIdByTeamId.get(teamId);
        if (!squadId) continue;

        const recorded = await this.tournamentsRepository.getRecordedPrizeTotal(
          { squadId, type: prize.type, matchId: match.id },
        );

        if (recorded !== prize.amount) {
          findings.push({
            type: 'PRIZE_MISMATCH',
            squadId,
            referenceId: match.id,
            expectedAmount: prize.amount,
            actualAmount: recorded,
            message: `Prêmio de resultado (${prize.type}) da partida não bate com o ruleset vigente em ${(match.playedAt as Date).toISOString()}`,
          });
        }
      }
    }

    return findings;
  }

  // Prêmio de posição (RANKING) da fase de grupos/liga, e campeão/vice
  // quando o formato é LEAGUE (não tem final pra decidir — é a tabela).
  private async auditGroupPositionAndTerminalPrizes(
    seasonId: string,
    format: TournamentFormat,
    phase: PhaseSummary,
    atTime: Date,
    hasNextPhase: boolean,
  ): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      phase.id,
    );
    const standingsByGroup =
      await this.buildGroupStandingsUseCase.execute(groupMatches);
    const allStandings = Object.values(standingsByGroup).flat();

    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        allStandings.map((standing) => standing.teamId),
        seasonId,
      );

    const { prizes } = await this.getActiveRulesetUseCase.execute(
      seasonId,
      atTime,
    );

    for (const standing of allStandings) {
      const squadId = squadIdByTeamId.get(standing.teamId);
      if (!squadId) continue;

      const expected = rankingReward(
        standing.position,
        prizes.groupPositionAmounts,
      );
      const recorded = await this.tournamentsRepository.getRecordedPrizeTotal({
        squadId,
        type: 'RANKING',
        phaseId: phase.id,
      });

      if (recorded !== expected) {
        findings.push({
          type: 'PRIZE_MISMATCH',
          squadId,
          referenceId: phase.id,
          expectedAmount: expected,
          actualAmount: recorded,
          message:
            'Prêmio de posição (RANKING) da fase não bate com o ruleset vigente',
        });
      }
    }

    if (!hasNextPhase && format === 'LEAGUE') {
      findings.push(
        ...(await this.auditChampionAndRunnerUp(
          {
            format,
            isLatestPhaseFullyPlayed: true,
            latestPhaseType: 'GROUP',
            standingsByGroup,
          },
          squadIdByTeamId,
          { phaseId: phase.id },
          prizes,
          phase.id,
        )),
      );
    }

    return findings;
  }

  // Prêmio de avanço de fase (PRIZE_PHASE) — times que avançaram são os
  // que aparecem nos confrontos da fase seguinte do mesmo torneio.
  private async auditPhaseAdvance(
    seasonId: string,
    phase: PhaseSummary,
    nextPhase: PhaseSummary,
    atTime: Date,
  ): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const nextMatches = await this.tournamentsRepository.findMatchesByPhase(
      nextPhase.id,
    );
    const advancingTeamIds = [
      ...new Set(
        nextMatches.flatMap((match) => [match.homeTeam.id, match.awayTeam.id]),
      ),
    ];

    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        advancingTeamIds,
        seasonId,
      );
    const { prizes } = await this.getActiveRulesetUseCase.execute(
      seasonId,
      atTime,
    );

    for (const teamId of advancingTeamIds) {
      const squadId = squadIdByTeamId.get(teamId);
      if (!squadId) continue;

      const recorded = await this.tournamentsRepository.getRecordedPrizeTotal({
        squadId,
        type: 'PRIZE_PHASE',
        phaseId: phase.id,
      });

      if (recorded !== prizes.phaseAdvance) {
        findings.push({
          type: 'PRIZE_MISMATCH',
          squadId,
          referenceId: phase.id,
          expectedAmount: prizes.phaseAdvance,
          actualAmount: recorded,
          message:
            'Prêmio de avanço de fase (PRIZE_PHASE) não bate com o ruleset vigente',
        });
      }
    }

    return findings;
  }

  // Campeão/vice da final de um mata-mata (KNOCKOUT, ou reta final de
  // GROUP_STAGE_KNOCKOUT) — fase sem próxima fase e com 1 partida só.
  private async auditKnockoutFinal(
    seasonId: string,
    format: TournamentFormat,
    matches: MatchWithTeams[],
    atTime: Date,
  ): Promise<AuditFinding[]> {
    const finalMatch = matches[0];
    const squadIdByTeamId =
      await this.tournamentsRepository.findSquadIdsByTeamIds(
        [finalMatch.homeTeam.id, finalMatch.awayTeam.id],
        seasonId,
      );
    const { prizes } = await this.getActiveRulesetUseCase.execute(
      seasonId,
      atTime,
    );

    const championInput = {
      format,
      isLatestPhaseFullyPlayed: true,
      latestPhaseType: 'KNOCKOUT' as const,
      knockoutMatches: matches.map((match) => ({
        homeTeamId: match.homeTeam.id,
        awayTeamId: match.awayTeam.id,
        goalScorerTeamIds: match.goalScorerTeamIds,
        penaltyWinnerTeamId: match.penalties?.winnerTeamId ?? null,
      })),
    };

    return this.auditChampionAndRunnerUp(
      championInput,
      squadIdByTeamId,
      { matchId: finalMatch.id },
      prizes,
      finalMatch.id,
    );
  }

  private async auditChampionAndRunnerUp(
    championInput: Parameters<typeof determineChampionTeamId>[0],
    squadIdByTeamId: Map<string, string>,
    link: { matchId: string } | { phaseId: string },
    prizes: RulesetPrizeTable,
    referenceId: string,
  ): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const championTeamId = determineChampionTeamId(championInput);
    const runnerUpTeamId = determineRunnerUpTeamId(championInput);

    const checks = [
      {
        teamId: championTeamId,
        type: 'CHAMPION' as const,
        expected: prizes.champion,
      },
      {
        teamId: runnerUpTeamId,
        type: 'RUNNER_UP' as const,
        expected: prizes.runnerUp,
      },
    ];

    for (const check of checks) {
      if (!check.teamId) continue;
      const squadId = squadIdByTeamId.get(check.teamId);
      if (!squadId) continue;

      const recorded = await this.tournamentsRepository.getRecordedPrizeTotal({
        squadId,
        type: check.type,
        ...link,
      });

      if (recorded !== check.expected) {
        findings.push({
          type: 'PRIZE_MISMATCH',
          squadId,
          referenceId,
          expectedAmount: check.expected,
          actualAmount: recorded,
          message: `Prêmio de ${check.type} não bate com o ruleset vigente`,
        });
      }
    }

    return findings;
  }
}
