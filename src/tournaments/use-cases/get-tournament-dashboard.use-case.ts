import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { GoalLeader, TournamentDashboard } from '../types';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';
import { ResolveGoalLeadersUseCase } from './resolve-goal-leaders.use-case';

@Injectable()
export class GetTournamentDashboardUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly resolveGoalLeadersUseCase: ResolveGoalLeadersUseCase,
  ) {}

  async execute(tournamentId: string): Promise<TournamentDashboard> {
    const tournament =
      await this.findTournamentOrThrowUseCase.execute(tournamentId);

    const currentPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);

    const matches = currentPhase
      ? await this.tournamentsRepository.findMatchesByPhase(currentPhase.id)
      : [];

    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [...new Set(matches.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]))],
      tournament.seasonId,
    );

    const nextMatch = matches.find(
      (match) =>
        match.playedAt === null &&
        (ownerByTeamId.has(match.homeTeam.id) ||
          ownerByTeamId.has(match.awayTeam.id)),
    );

    const [topScorer] = await this.tournamentsRepository.findTopScorers(
      tournamentId,
      1,
    );
    const [topAssist] = await this.tournamentsRepository.findTopAssists(
      tournamentId,
      1,
    );

    const [topScorerLeader, topAssistLeader] = await Promise.all([
      this.resolveGoalLeader(topScorer),
      this.resolveGoalLeader(topAssist),
    ]);

    const playedMatches = matches.filter(
      (match) => match.playedAt !== null,
    ).length;

    const getNextMatch = () => {
      if (!nextMatch && !currentPhase) return null;

      return {
        id: nextMatch.id,
        phaseName: currentPhase.name,
        groupLabel: nextMatch.groupLabel,
        round: nextMatch.round,
        homeTeam: nextMatch.homeTeam,
        awayTeam: nextMatch.awayTeam,
      };
    };

    return {
      name: tournament.name,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      createdAt: tournament.createdAt,
      currentPhase,
      totalMatches: matches.length,
      playedMatches,
      remainingMatches: matches.length - playedMatches,
      topScorer: topScorerLeader,
      topAssist: topAssistLeader,
      nextMatch: getNextMatch(),
    };
  }

  private async resolveGoalLeader(
    leader: { playerId: string; count: number } | undefined,
  ): Promise<GoalLeader | null> {
    if (!leader) return null;

    const [resolved] = await this.resolveGoalLeadersUseCase.execute([leader]);
    return resolved ?? null;
  }
}
