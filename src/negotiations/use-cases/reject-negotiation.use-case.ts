import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SquadsRepository } from '../../squads/squads.repository';
import { NegotiationResponseDTO } from '../dto/response';
import { NegotiationsRepository } from '../negotiations.repository';

@Injectable()
export class RejectNegotiationUseCase {
  constructor(
    private readonly negotiationsRepository: NegotiationsRepository,
    private readonly squadsRepository: SquadsRepository,
  ) {}

  async execute(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    const negotiation =
      await this.negotiationsRepository.findByIdWithTeams(negotiationId);

    if (!negotiation || negotiation.seasonId !== seasonId)
      throw new NotFoundException('Negociação não encontrada');

    if (negotiation.status !== 'PENDING')
      throw new ConflictException('Essa negociação já foi resolvida');

    const targetSquad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!targetSquad || targetSquad.id !== negotiation.targetSquadId)
      throw new ForbiddenException(
        'Só o time convidado pode rejeitar essa negociação',
      );

    return this.negotiationsRepository.reject(negotiationId);
  }
}
