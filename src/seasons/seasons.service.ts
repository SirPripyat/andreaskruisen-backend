import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Season } from '../../generated/prisma/client';
import { CreateSeason } from './dto/create-season.schema';
import { SeasonsRepository } from './seasons.repository';

@Injectable()
export class SeasonsService {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  @Transactional()
  async start(dto: CreateSeason): Promise<Season> {
    const season = await this.seasonsRepository.create({ name: dto.name });
    await this.seasonsRepository.seedPlayerAssignmentsFromRealTeams(season.id);
    return season;
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
    const season = await this.seasonsRepository.findById(id);

    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    return this.seasonsRepository.setActive(id);
  }
}
