import { Injectable, NotFoundException } from '@nestjs/common';
import { isPrismaErrorCode, PRISMA_ERROR_CODE } from 'src/commons/utils';
import { SelectSeasonResponseDTO } from '../dto';
import { MeRepository } from '../me.repository';

@Injectable()
export class SelectSeasonUseCase {
  constructor(private readonly repository: MeRepository) {}

  execute(id: string, seasonId: string): Promise<SelectSeasonResponseDTO> {
    return this.repository.selectSeason(id, seasonId).catch((error) => {
      if (isPrismaErrorCode(error, PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION))
        throw new NotFoundException('Temporada não encontrada');

      throw error;
    });
  }
}
