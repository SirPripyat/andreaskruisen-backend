import { Injectable, NotFoundException } from '@nestjs/common';
import { SquadsRepository } from '../../squads/squads.repository';
import { NegotiationResponseDTO } from '../dto/response';
import { NegotiationsRepository } from '../negotiations.repository';

@Injectable()
export class ListNegotiationsUseCase {
  constructor(
    private readonly negotiationsRepository: NegotiationsRepository,
    private readonly squadsRepository: SquadsRepository,
  ) {}

  async execute(
    seasonId: string,
    userId: string,
  ): Promise<NegotiationResponseDTO[]> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    return this.negotiationsRepository.findForSquad(squad.id);
  }
}
