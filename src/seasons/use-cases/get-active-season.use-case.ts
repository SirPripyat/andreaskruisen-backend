import { Injectable } from '@nestjs/common';
import { GetActiveSeasonResponseDTO } from '../dto/response';
import { SeasonsRepository } from '../seasons.repository';

@Injectable()
export class GetActiveSeasonUseCase {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  execute(): Promise<GetActiveSeasonResponseDTO> {
    return this.seasonsRepository.findActive();
  }
}
