import { BadRequestException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../seasons.repository';
import { FindSeasonOrThrowUseCase } from './find-season-or-throw.use-case';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class RemoveSeasonUseCase {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly findSeasonOrThrowUseCase: FindSeasonOrThrowUseCase,
  ) {}

  @Transactional()
  async execute(id: string): Promise<void> {
    await this.findSeasonOrThrowUseCase.execute(id);
    await this.seasonsRepository.delete(id).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException(
          'Não é possível excluir a temporada: existem dados vinculados a ela',
        );
      }
      throw error;
    });
  }
}
