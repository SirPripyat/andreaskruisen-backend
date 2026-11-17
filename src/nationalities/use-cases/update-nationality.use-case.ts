import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UpdateNationalityRequestDTO } from '../dto/request';
import { UpdateNationalityResponseDTO } from '../dto/response';
import { NationalitiesRepository } from '../nationalities.repository';
import { FindNationalityOrThrowUseCase } from './find-nationality-or-throw.use-case';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class UpdateNationalityUseCase {
  constructor(
    private readonly nationalitiesRepository: NationalitiesRepository,
    private readonly findNationalityOrThrowUseCase: FindNationalityOrThrowUseCase,
  ) {}

  async execute(
    id: string,
    dto: UpdateNationalityRequestDTO,
  ): Promise<UpdateNationalityResponseDTO> {
    await this.findNationalityOrThrowUseCase.execute(id);

    try {
      return await this.nationalitiesRepository.update(id, {
        name: dto.name,
        flagUrl: dto.flagUrl,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(
          'Já existe uma nacionalidade com esse nome',
        );
      }
      throw error;
    }
  }
}
