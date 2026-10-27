import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma, Season } from '../../generated/prisma/client';
import { CreateSeason } from './dto/create-season.schema';
import { UpdateSeason } from './dto/update-season.schema';
import { SeasonsRepository } from './seasons.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class SeasonsService {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  @Transactional()
  async start(dto: CreateSeason): Promise<Season> {
    const season = await this.seasonsRepository.create({ name: dto.name });
    await this.seasonsRepository.seedPlayerAssignmentsFromRealTeams(season.id);

    if (dto.squads?.length) {
      try {
        await this.seasonsRepository.createSquads(season.id, dto.squads);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
            throw new ConflictException(
              'Cada usuário e cada time só pode aparecer uma vez na temporada',
            );
          }
          if (error.code === FOREIGN_KEY_VIOLATION) {
            throw new BadRequestException('Usuário ou time não encontrado');
          }
        }
        throw error;
      }
    }

    return season;
  }

  async update(id: string, dto: UpdateSeason): Promise<Season> {
    await this.findOrThrow(id);

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

  @Transactional()
  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.seasonsRepository.delete(id);
  }

  findAll(): Promise<Season[]> {
    return this.seasonsRepository.findAll();
  }

  async getActive(): Promise<Season> {
    const season = await this.seasonsRepository.findActive();

    if (!season) {
      throw new NotFoundException('Nenhuma temporada selecionada');
    }

    return season;
  }

  @Transactional()
  async selectActive(id: string): Promise<Season> {
    await this.findOrThrow(id);
    return this.seasonsRepository.setActive(id);
  }

  private async findOrThrow(id: string): Promise<Season> {
    const season = await this.seasonsRepository.findById(id);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }
    return season;
  }
}
