import { Injectable } from '@nestjs/common';
import { ListPlayersForSeasonResponseDTO, ListPlayersRequestDTO } from '../dto';
import { PlayersRepository } from '../players.repository';
import { buildPlayersFilter, toPlayerListItem } from '../utils';

@Injectable()
export class ListPlayersForSeasonUseCase {
  constructor(private readonly playersRepository: PlayersRepository) {}

  async execute(
    seasonId: string,
    userId: string,
    query: ListPlayersRequestDTO,
  ): Promise<ListPlayersForSeasonResponseDTO> {
    const result = await this.playersRepository.findPaginatedForSeason(
      seasonId,
      userId,
      buildPlayersFilter(query),
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );

    return {
      ...result,
      data: result.data.map((assignment) => ({
        ...toPlayerListItem(assignment.player, assignment.team),
        isFavorite: assignment.player.favoritedBy.length > 0,
      })),
    };
  }
}
