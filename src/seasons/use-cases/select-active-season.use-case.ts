import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SelectActiveSeasonResponseDTO } from '../dto/response';
import { SeasonsRepository } from '../seasons.repository';
import { FindSeasonOrThrowUseCase } from './find-season-or-throw.use-case';

@Injectable()
export class SelectActiveSeasonUseCase {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly findSeasonOrThrowUseCase: FindSeasonOrThrowUseCase,
  ) {}

  @Transactional()
  async execute(id: string): Promise<SelectActiveSeasonResponseDTO> {
    await this.findSeasonOrThrowUseCase.execute(id);
    return this.seasonsRepository.setActive(id);
  }
}
