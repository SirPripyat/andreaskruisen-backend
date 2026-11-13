import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Nationality, Prisma } from '../../generated/prisma/client';
import { PaginatedResult } from '../commons/pagination';
import { ListNationalitiesQuery } from './dto/list-nationalities.schema';
import { UpdateNationality } from './dto/update-nationality.schema';
import { NationalitiesRepository } from './nationalities.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class NationalitiesService {
  constructor(
    private readonly nationalitiesRepository: NationalitiesRepository,
  ) {}

  list(query: ListNationalitiesQuery): Promise<PaginatedResult<Nationality>> {
    return this.nationalitiesRepository.findPaginated(
      { name: query.name },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }

  async findOne(id: string): Promise<Nationality> {
    return this.findOrThrow(id);
  }

  async update(id: string, dto: UpdateNationality): Promise<Nationality> {
    await this.findOrThrow(id);

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

  private async findOrThrow(id: string): Promise<Nationality> {
    const nationality = await this.nationalitiesRepository.findById(id);
    if (!nationality) {
      throw new NotFoundException('Nacionalidade não encontrada');
    }
    return nationality;
  }
}
