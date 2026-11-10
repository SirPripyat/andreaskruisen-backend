import { Injectable, NotFoundException } from '@nestjs/common';
import { GetSituationQuery } from '../dto/get-situation.schema';
import { TournamentsRepository } from '../tournaments.repository';
import { Matchup, StandingWithOwner, TournamentSituation } from '../types';
import { BuildGroupStandingsUseCase } from './build-group-standings.use-case';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class GetTournamentSituationUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
  ) {}

  async execute(
    tournamentId: string,
    query: GetSituationQuery,
  ): Promise<TournamentSituation> {
    const [tournament, phase] = await Promise.all([
      this.findTournamentOrThrowUseCase.execute(tournamentId),
      query.round
        ? this.tournamentsRepository.findPhaseByOrder(tournamentId, query.round)
        : this.tournamentsRepository.findLatestPhase(tournamentId),
    ]);

    if (!phase) {
      throw new NotFoundException(
        query.round
          ? 'Rodada não encontrada'
          : 'Torneio ainda não tem fase gerada',
      );
    }

    if (phase.type === 'KNOCKOUT') {
      return {
        phase,
        matches: await this.buildMatchups(
          phase.id,
          tournament.seasonId,
          query.onlyOwnedTeams,
        ),
      };
    }

    return {
      phase,
      groups: await this.buildGroupsWithOwners(
        phase.id,
        tournament.seasonId,
        query.onlyOwnedTeams,
      ),
    };
  }

  private async buildMatchups(
    phaseId: string,
    seasonId: string,
    onlyOwnedTeams: boolean,
  ): Promise<Matchup[]> {
    const matches =
      await this.tournamentsRepository.findMatchesByPhase(phaseId);

    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [...new Set(matches.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]))],
      seasonId,
    );

    const matchups = matches.map((match) => ({
      id: match.id,
      homeTeam: {
        ...match.homeTeam,
        owner: ownerByTeamId.get(match.homeTeam.id) ?? null,
      },
      awayTeam: {
        ...match.awayTeam,
        owner: ownerByTeamId.get(match.awayTeam.id) ?? null,
      },
    }));

    return onlyOwnedTeams
      ? matchups.filter((m) => m.homeTeam.owner || m.awayTeam.owner)
      : matchups;
  }

  private async buildGroupsWithOwners(
    phaseId: string,
    seasonId: string,
    onlyOwnedTeams: boolean,
  ): Promise<Record<string, StandingWithOwner[]>> {
    const groupMatches =
      await this.tournamentsRepository.findGroupMatches(phaseId);

    const [standingsByGroup, ownerByTeamId] = await Promise.all([
      this.buildGroupStandingsUseCase.execute(groupMatches),
      this.tournamentsRepository.findOwnersByTeamIds(
        [...new Set(groupMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))],
        seasonId,
      ),
    ]);

    const groupsWithOwners: Record<string, StandingWithOwner[]> = {};

    for (const [groupLabel, standings] of Object.entries(standingsByGroup)) {
      const withOwners = standings.map((standing) => ({
        ...standing,
        owner: ownerByTeamId.get(standing.teamId) ?? null,
      }));

      if (!onlyOwnedTeams || withOwners.some((s) => s.owner))
        groupsWithOwners[groupLabel] = withOwners;
    }

    return groupsWithOwners;
  }
}
