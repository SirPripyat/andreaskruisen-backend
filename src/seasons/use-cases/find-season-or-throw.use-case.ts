import { Injectable, NotFoundException } from '@nestjs/common';
import { Season } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../seasons.repository';

@Injectable()
export class FindSeasonOrThrowUseCase {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  async execute(id: string): Promise<Season> {
    const season = await this.seasonsRepository.findById(id);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }
    return season;
  }
}
