import { Injectable } from '@nestjs/common';
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
}
