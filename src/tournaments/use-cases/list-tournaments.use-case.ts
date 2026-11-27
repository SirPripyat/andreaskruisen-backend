import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { MatchupTeam, TournamentListItem } from '../types';
import { readQualifiersPerGroup } from '../utils';
import { GetChampionTeamIdUseCase } from './get-champion-team-id.use-case';

@Injectable()
export class ListTournamentsUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly getChampionTeamIdUseCase: GetChampionTeamIdUseCase,
  ) {}

  async execute(seasonId: string): Promise<TournamentListItem[]> {
    const tournaments = await this.tournamentsRepository.findBySeason(seasonId);

    const [currentPhases, championTeamIds] = await Promise.all([
      Promise.all(
        tournaments.map((tournament) =>
          this.tournamentsRepository.findLatestPhase(tournament.id),
        ),
      ),
      Promise.all(
        tournaments.map((tournament) =>
          tournament.finishedAt
            ? this.getChampionTeamIdUseCase.execute(tournament.id)
            : null,
        ),
      ),
    ]);

    const champions = await this.findChampions(championTeamIds, seasonId);

    return tournaments.map((tournament, index) => {
      const championTeamId = championTeamIds[index];

      return {
        id: tournament.id,
        seasonId: tournament.seasonId,
        name: tournament.name,
        format: tournament.format,
        maxTeams: tournament.maxTeams,
        createdAt: tournament.createdAt,
        finishedAt: tournament.finishedAt,
        currentPhase: currentPhases[index],
        qualifiersPerGroup: readQualifiersPerGroup(tournament),
        champion: championTeamId
          ? (champions.get(championTeamId) ?? null)
          : null,
      };
    });
  }

  private async findChampions(
    championTeamIds: (string | null)[],
    seasonId: string,
  ): Promise<Map<string, MatchupTeam>> {
    const teamIds = [
      ...new Set(championTeamIds.filter((id): id is string => id !== null)),
    ];
    if (teamIds.length === 0) return new Map();

    const [teams, owners] = await Promise.all([
      this.tournamentsRepository.findTeamsByIds(teamIds),
      this.tournamentsRepository.findOwnersByTeamIds(teamIds, seasonId),
    ]);

    return new Map(
      teams.map((team) => [
        team.id,
        { ...team, owner: owners.get(team.id) ?? null },
      ]),
    );
  }
}
