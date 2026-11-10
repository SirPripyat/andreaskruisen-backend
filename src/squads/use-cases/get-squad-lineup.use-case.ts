import { Injectable, NotFoundException } from '@nestjs/common';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../squads.repository';
import { LineupOverview } from '../types';

@Injectable()
export class GetSquadLineupUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(seasonId: string, teamId: string): Promise<LineupOverview> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');

    return this.squadsRepository.findLineupOverview(seasonId, teamId);
  }
}
