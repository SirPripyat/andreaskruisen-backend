import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { MatchesByPhase } from '../types';
import { toMatchListItem } from '../utils';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class GetTournamentFixturesUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
  ) {}

  async execute(
    tournamentId: string,
    onlyOwnedTeams?: boolean,
  ): Promise<MatchesByPhase[]> {
    const tournament =
      await this.findTournamentOrThrowUseCase.execute(tournamentId);

    const phases =
      await this.tournamentsRepository.findPhasesByTournament(tournamentId);
    if (phases.length === 0) {
      return [];
    }

    const teamIds = onlyOwnedTeams
      ? await this.tournamentsRepository.findOwnedTeamIds(tournament.seasonId)
      : undefined;

    const matchesByPhase = await Promise.all(
      phases.map((phase) =>
        this.tournamentsRepository.findMatchesByPhase(phase.id, teamIds),
      ),
    );

    const latestOrder = phases[phases.length - 1].order;

    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [
        ...new Set(
          matchesByPhase
            .flat()
            .flatMap((match) => [match.homeTeam.id, match.awayTeam.id]),
        ),
      ],
      tournament.seasonId,
    );

    return phases.map((phase, index) => ({
      phase,
      matches: matchesByPhase[index].map((match) =>
        toMatchListItem(match, phase.order < latestOrder, ownerByTeamId),
      ),
    }));
  }
}
