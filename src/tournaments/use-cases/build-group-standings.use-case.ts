import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { GroupPhaseMatch, TeamSummary } from '../types';
import {
  computeGroupStandings,
  computeMatchScore,
  GroupStanding,
} from '../utils';

// Classificação de cada grupo (GROUP_STAGE_KNOCKOUT ou LEAGUE) a partir das
// partidas da fase — usado tanto pra exibir a situação do torneio quanto
// pra decidir quem avança pro mata-mata (ver AdvancePhaseUseCase) e quem é
// campeão (ver GetChampionTeamIdUseCase).
@Injectable()
export class BuildGroupStandingsUseCase {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  async execute(
    groupMatches: GroupPhaseMatch[],
  ): Promise<Record<string, GroupStanding[]>> {
    const teamIds = [
      ...new Set(
        groupMatches.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
      ),
    ];
    const teams = await this.tournamentsRepository.findTeamsByIds(teamIds);
    const teamById = new Map(teams.map((team) => [team.id, team]));

    const matchesByGroup = new Map<string, GroupPhaseMatch[]>();
    for (const match of groupMatches) {
      const group = matchesByGroup.get(match.groupLabel) ?? [];
      group.push(match);
      matchesByGroup.set(match.groupLabel, group);
    }

    const standingsByGroup: Record<string, GroupStanding[]> = {};
    for (const [groupLabel, matches] of matchesByGroup) {
      const groupTeamIds = [
        ...new Set(
          matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
        ),
      ];
      const groupTeams = groupTeamIds
        .map((id) => teamById.get(id))
        .filter((team): team is TeamSummary => team !== undefined);

      standingsByGroup[groupLabel] = computeGroupStandings(
        groupTeams,
        matches.map((match) => ({
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          result: match.playedAt
            ? computeMatchScore(
                match.homeTeamId,
                match.awayTeamId,
                match.goalScorerTeamIds,
              )
            : null,
        })),
      );
    }

    return standingsByGroup;
  }
}
