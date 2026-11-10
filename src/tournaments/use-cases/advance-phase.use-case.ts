import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { TournamentsRepository } from '../tournaments.repository';
import { GeneratedKnockoutMatch, PhaseSummary } from '../types';
import { computeMatchScore, knockoutRoundName } from '../utils';
import { BuildGroupStandingsUseCase } from './build-group-standings.use-case';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class AdvancePhaseUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
  ) {}

  @Transactional()
  async execute(tournamentId: string, phaseId: string): Promise<void> {
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

    if (phase.type === 'GROUP') {
      await this.advanceFromGroupStage(tournamentId, phase);
      return;
    }

    await this.advanceKnockoutRound(tournamentId, phase);
  }

  private async advanceFromGroupStage(
    tournamentId: string,
    phase: PhaseSummary,
  ): Promise<void> {
    const tournament = await this.tournamentsRepository.findById(tournamentId);

    if (tournament?.format !== 'GROUP_STAGE_KNOCKOUT')
      throw new ConflictException('Este torneio não tem fase de mata-mata');

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      phase.id,
    );

    const standingsByGroup =
      await this.buildGroupStandingsUseCase.execute(groupMatches);

    const groupLabels = Object.keys(standingsByGroup).sort();

    const firstPlaced = groupLabels.map((label) => standingsByGroup[label][0]);
    const secondPlaced = groupLabels.map((label) => standingsByGroup[label][1]);

    const matches = firstPlaced.map((first, i) => ({
      homeTeamId: first.teamId,
      awayTeamId: secondPlaced[(i + 1) % secondPlaced.length].teamId,
    }));

    await this.createNextKnockoutPhase(tournamentId, phase.order, matches);
  }

  private async advanceKnockoutRound(
    tournamentId: string,
    phase: PhaseSummary,
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

    const nextMatches: GeneratedKnockoutMatch[] = [];

    for (let i = 0; i < winnerTeamIds.length; i += 2)
      nextMatches.push({
        homeTeamId: winnerTeamIds[i],
        awayTeamId: winnerTeamIds[i + 1],
      });

    await this.createNextKnockoutPhase(tournamentId, phase.order, nextMatches);
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
