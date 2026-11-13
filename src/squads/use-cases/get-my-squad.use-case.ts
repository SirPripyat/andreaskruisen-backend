import { Injectable, NotFoundException } from '@nestjs/common';
import { GetMySquadResponseDTO } from '../dto';
import { SquadsRepository } from '../squads.repository';

@Injectable()
export class GetMySquadUseCase {
  constructor(private readonly squadsRepository: SquadsRepository) {}

  async execute(
    userId: string,
    seasonId: string,
  ): Promise<GetMySquadResponseDTO> {
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
