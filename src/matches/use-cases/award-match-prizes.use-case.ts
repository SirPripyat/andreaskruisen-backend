import { ConflictException, Injectable } from '@nestjs/common';
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
import { MatchForGoals } from '../types';

// Variante de MatchForGoals com awayTeamId garantido não-nulo — usada pelos
// métodos privados daqui pra baixo, todos chamados só depois do guard em
// execute() (bye nunca chega a fixar placar, ver ReplaceMatchGoalsUseCase/
// SimulateMatchUseCase).
type MatchForGoalsWithAway = MatchForGoals & { awayTeamId: string };

// Reaproveitado por qualquer use-case que fixe o placar de uma partida —
// hoje ReplaceMatchGoalsUseCase (edição manual) e SimulateMatchUseCase
// (simulação) — pra garantir que os dois disparem exatamente os mesmos
// prêmios (ver docs/regras-temporada), sem duplicar a lógica.
@Injectable()
export class AwardMatchPrizesUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly awardTournamentPrizeUseCase: AwardTournamentPrizeUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  async execute(
    match: MatchForGoals,
    homeGoals: number,
    awayGoals: number,
    penalties: MatchPenalties | null,
  ): Promise<void> {
    // Bye (awayTeamId null) nunca chega aqui: ReplaceMatchGoalsUseCase e
    // SimulateMatchUseCase já rejeitam antes de fixar qualquer placar — este
    // guard é só pra manter o tipo estreito pro resto do método.
    if (!match.awayTeamId)
      throw new ConflictException('Partida de bye não pode premiar resultado');
    const matchWithAway = match as MatchForGoalsWithAway;

    const { prizes } = await this.getActiveRulesetUseCase.execute(
      match.seasonId,
    );

    await this.awardMatchResultPrizes(
      matchWithAway,
      homeGoals,
      awayGoals,
      penalties,
      prizes,
    );
    await this.awardTerminalPrizesIfTournamentJustFinished(
      matchWithAway,
      prizes,
    );
  }

  // Prêmio de resultado (WIN/DRAW/LOSS) — toda partida, de qualquer
  // formato/fase, sempre que o placar é fixado (ou corrigido).
  private async awardMatchResultPrizes(
    match: MatchForGoalsWithAway,
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
  // de fase anterior já teria sido rejeitada por `locked` no caller.
  private async awardTerminalPrizesIfTournamentJustFinished(
    match: MatchForGoalsWithAway,
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
    match: MatchForGoalsWithAway,
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
    match: MatchForGoalsWithAway,
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
        awayTeamId: knockoutMatch.awayTeam?.id ?? null,
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
}
