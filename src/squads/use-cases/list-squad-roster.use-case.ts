import { Injectable, NotFoundException } from '@nestjs/common';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { ListSquadRosterResponseDTO } from '../dto';
import { SquadsRepository } from '../squads.repository';
import { groupBySector } from '../utils';

@Injectable()
export class ListSquadRosterUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(
    seasonId: string,
    teamId: string,
  ): Promise<ListSquadRosterResponseDTO> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');

    const players = await this.squadsRepository.findRoster(seasonId, teamId);

    return groupBySector(players);
  }
}
