import { Injectable } from '@nestjs/common';
import { ListSeasonsResponseDTO } from '../dto/response';
import { SeasonsRepository } from '../seasons.repository';

@Injectable()
export class ListSeasonsUseCase {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  execute(): Promise<ListSeasonsResponseDTO> {
    return this.seasonsRepository.findAll();
  }
}
