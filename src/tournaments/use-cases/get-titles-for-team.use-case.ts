import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { TeamTitle } from '../types';
import { GetChampionTeamIdUseCase } from './get-champion-team-id.use-case';

// Histórico de títulos de um time (independente de quem o comandou em
// cada temporada, já que TournamentTeam aponta pro Team real — ver
// schema). Percorre todos os torneios de que o time já participou, em
// qualquer temporada, e verifica se ele foi o campeão de cada um.
@Injectable()
export class GetTitlesForTeamUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly getChampionTeamIdUseCase: GetChampionTeamIdUseCase,
  ) {}

  async execute(teamId: string): Promise<TeamTitle[]> {
    const tournaments =
      await this.tournamentsRepository.findTournamentsByTeam(teamId);

    const titles: TeamTitle[] = [];
    for (const tournament of tournaments) {
      const championTeamId = await this.getChampionTeamIdUseCase.execute(
        tournament.tournamentId,
      );
      if (championTeamId === teamId) {
        titles.push(tournament);
      }
    }
    return titles;
  }
}
