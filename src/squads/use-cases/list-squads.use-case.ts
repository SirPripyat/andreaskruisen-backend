import { Injectable, NotFoundException } from '@nestjs/common';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { ListSquadsResponseDTO } from '../dto';
import { SquadsRepository } from '../squads.repository';

@Injectable()
export class ListSquadsUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(seasonId: string): Promise<ListSquadsResponseDTO> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');

    return this.squadsRepository.findAllForSeason(seasonId);
  }
}
