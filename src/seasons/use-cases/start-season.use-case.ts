import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma } from '../../../generated/prisma/client';
import { CreateSeasonRequestDTO } from '../dto/request';
import { StartSeasonResponseDTO } from '../dto/response';
import { SeasonsRepository } from '../seasons.repository';
import { StartSeasonEconomyUseCase } from './start-season-economy.use-case';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class StartSeasonUseCase {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly startSeasonEconomyUseCase: StartSeasonEconomyUseCase,
  ) {}

  @Transactional()
  async execute(dto: CreateSeasonRequestDTO): Promise<StartSeasonResponseDTO> {
    const season = await this.seasonsRepository.create({ name: dto.name });
    await this.seasonsRepository.seedPlayerAssignmentsFromRealTeams(season.id);

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

    return this.startSeasonEconomyUseCase.execute(season.id);
  }
}
