import { Injectable, NotFoundException } from '@nestjs/common';
import { TeamsRepository } from '../teams.repository';
import { TeamWithRatings } from '../types';

@Injectable()
export class FindTeamOrThrowUseCase {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute(id: string): Promise<TeamWithRatings> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }
    return team;
  }
}
