import { Injectable } from '@nestjs/common';
import { ListLeaguesRequestDTO, ListLeaguesResponseDTO } from '../dto';
import { LeaguesRepository } from '../leagues.repository';

@Injectable()
export class ListLeaguesUseCase {
  constructor(private readonly repository: LeaguesRepository) {}

  execute(query: ListLeaguesRequestDTO): Promise<ListLeaguesResponseDTO> {
    return this.repository.findPaginated(
      {
        name: query.name,
      },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }
}
