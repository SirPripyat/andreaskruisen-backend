import { Injectable } from '@nestjs/common';
import { ListNationalitiesRequestDTO } from '../dto/request';
import { ListNationalitiesResponseDTO } from '../dto/response';
import { NationalitiesRepository } from '../nationalities.repository';

@Injectable()
export class ListNationalitiesUseCase {
  constructor(
    private readonly nationalitiesRepository: NationalitiesRepository,
  ) {}

  execute(
    query: ListNationalitiesRequestDTO,
  ): Promise<ListNationalitiesResponseDTO> {
    return this.nationalitiesRepository.findPaginated(
      { name: query.name },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }
}
