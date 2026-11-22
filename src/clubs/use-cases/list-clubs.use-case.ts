import { Injectable } from '@nestjs/common';
import { ClubsRepository } from '../clubs.repository';
import { ListClubsRequestDTO } from '../dto/request';
import { ListClubsResponseDTO } from '../dto/response';

@Injectable()
export class ListClubsUseCase {
  constructor(private readonly clubsRepository: ClubsRepository) {}

  execute(
    query: ListClubsRequestDTO,
    seasonId: string,
  ): Promise<ListClubsResponseDTO> {
    return this.clubsRepository.findPaginated(
      { name: query.name, leagueId: query.leagueId },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
      seasonId,
    );
  }
}
