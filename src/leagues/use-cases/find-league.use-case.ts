import { Injectable, NotFoundException } from '@nestjs/common';
import { FindLeagueResponseDTO } from '../dto';
import { LeaguesRepository } from '../leagues.repository';

@Injectable()
export class FindLeagueUseCase {
  constructor(private readonly repository: LeaguesRepository) {}

  async execute(id: string): Promise<FindLeagueResponseDTO> {
    const league = await this.repository.findById(id);

    if (!league) throw new NotFoundException('Liga não encontrada');

    return league;
  }
}
