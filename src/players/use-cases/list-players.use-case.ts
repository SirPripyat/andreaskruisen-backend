import { Injectable } from '@nestjs/common';
import { ListPlayersRequestDTO, ListPlayersResponseDTO } from '../dto';
import { PlayersRepository } from '../players.repository';
import { buildPlayersFilter, toPlayerListItem } from '../utils';

@Injectable()
export class ListPlayersUseCase {
  constructor(private readonly playersRepository: PlayersRepository) {}

  async execute(query: ListPlayersRequestDTO): Promise<ListPlayersResponseDTO> {
    const result = await this.playersRepository.findPaginated(
      buildPlayersFilter(query),
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );

    return {
      ...result,
      data: result.data.map((player) => toPlayerListItem(player, player.team)),
    };
  }
}
