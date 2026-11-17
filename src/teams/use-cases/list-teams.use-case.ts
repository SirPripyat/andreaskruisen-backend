import { Injectable } from '@nestjs/common';
import { ListTeamsRequestDTO } from '../dto/request';
import { ListTeamsResponseDTO } from '../dto/response';
import { TeamsRepository } from '../teams.repository';

@Injectable()
export class ListTeamsUseCase {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  execute(query: ListTeamsRequestDTO): Promise<ListTeamsResponseDTO> {
    return this.teamsRepository.findPaginated(
      { name: query.name, leagueId: query.leagueId },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }
}
