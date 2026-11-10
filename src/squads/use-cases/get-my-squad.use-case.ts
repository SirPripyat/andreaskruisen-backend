import { Injectable, NotFoundException } from '@nestjs/common';
import { Squad } from '../../../generated/prisma/client';
import { SquadsRepository } from '../squads.repository';
import { RosterPlayer } from '../types';

@Injectable()
export class GetMySquadUseCase {
  constructor(private readonly squadsRepository: SquadsRepository) {}

  async execute(
    userId: string,
    seasonId: string,
  ): Promise<{ squad: Squad; players: RosterPlayer[] }> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    const players = await this.squadsRepository.findRoster(
      seasonId,
      squad.teamId,
    );

    return { squad, players };
  }
}
