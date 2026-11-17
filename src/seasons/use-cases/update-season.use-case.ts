import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UpdateSeasonRequestDTO } from '../dto/request';
import { UpdateSeasonResponseDTO } from '../dto/response';
import { SeasonsRepository } from '../seasons.repository';
import { FindSeasonOrThrowUseCase } from './find-season-or-throw.use-case';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class UpdateSeasonUseCase {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly findSeasonOrThrowUseCase: FindSeasonOrThrowUseCase,
  ) {}

  async execute(
    id: string,
    dto: UpdateSeasonRequestDTO,
  ): Promise<UpdateSeasonResponseDTO> {
    await this.findSeasonOrThrowUseCase.execute(id);

    try {
      return await this.seasonsRepository.update(id, { name: dto.name });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Já existe uma temporada com esse nome');
      }
      throw error;
    }
  }
}
