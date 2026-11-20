import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Season } from '../../../generated/prisma/client';
import { isPrismaErrorCode, PRISMA_ERROR_CODE } from '../../commons/utils';
import { CreateSeasonRequestDTO } from '../dto/request';
import { StartSeasonResponseDTO } from '../dto/response';
import { SeasonsRepository } from '../seasons.repository';
import { StartSeasonEconomyUseCase } from './start-season-economy.use-case';

@Injectable()
export class StartSeasonUseCase {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly startSeasonEconomyUseCase: StartSeasonEconomyUseCase,
  ) {}

  // Timeout maior que o padrão (5s) porque seedPlayerAssignmentsFromRealTeams
  // recria o vínculo jogador-time pra todo o elenco real na criação da
  // temporada, e isso já passa do padrão com a base atual de jogadores.
  @Transactional<TransactionalAdapterPrisma<PrismaClient>>({
    timeout: 30_000,
  })
  async execute(dto: CreateSeasonRequestDTO): Promise<StartSeasonResponseDTO> {
    const season = await this.createSeason(dto.name);
    await this.seasonsRepository.setActive(season.id);
    await this.seasonsRepository.seedPlayerAssignmentsFromRealTeams(season.id);
    await this.createSquads(season.id, dto.squads);

    return this.startSeasonEconomyUseCase.execute(season.id);
  }

  private async createSeason(name: string): Promise<Season> {
    try {
      return await this.seasonsRepository.create({ name });
    } catch (error) {
      if (
        isPrismaErrorCode(error, PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT_VIOLATION)
      )
        throw new ConflictException('Já existe uma temporada com esse nome');

      throw error;
    }
  }

  private async createSquads(
    seasonId: string,
    squads: CreateSeasonRequestDTO['squads'],
  ): Promise<void> {
    try {
      await this.seasonsRepository.createSquads(seasonId, squads);
    } catch (error) {
      if (
        isPrismaErrorCode(error, PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT_VIOLATION)
      )
        throw new ConflictException(
          'Cada usuário e cada time só pode aparecer uma vez na temporada',
        );

      if (isPrismaErrorCode(error, PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION))
        throw new BadRequestException('Usuário ou time não encontrado');

      throw error;
    }
  }
}
