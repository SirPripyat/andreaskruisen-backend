import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../commons/pagination';
import { ListTeamsQuery } from './dto/list-teams.schema';
import { TeamsRepository, TeamWithRatings } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  list(query: ListTeamsQuery): Promise<PaginatedResult<TeamWithRatings>> {
    return this.teamsRepository.findPaginated(
      { name: query.name },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }
}
