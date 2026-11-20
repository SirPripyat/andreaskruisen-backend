import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NEGOTIATION_ACCEPTED_EVENT,
  NEGOTIATION_PROPOSED_EVENT,
  NEGOTIATION_REJECTED_EVENT,
} from '../notifications/events';
import { ProposeNegotiationRequestDTO } from './dto';
import { NegotiationResponseDTO } from './dto/response';
import { NegotiationDirection } from './types';
import {
  AcceptNegotiationUseCase,
  ListNegotiationsUseCase,
  ProposeNegotiationUseCase,
  RejectNegotiationUseCase,
} from './use-cases';

@Injectable()
export class NegotiationsFacade {
  constructor(
    private readonly proposeNegotiationUseCase: ProposeNegotiationUseCase,
    private readonly acceptNegotiationUseCase: AcceptNegotiationUseCase,
    private readonly rejectNegotiationUseCase: RejectNegotiationUseCase,
    private readonly listNegotiationsUseCase: ListNegotiationsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async propose(
    seasonId: string,
    userId: string,
    dto: ProposeNegotiationRequestDTO,
  ): Promise<NegotiationResponseDTO> {
    const negotiation = await this.proposeNegotiationUseCase.execute(
      seasonId,
      userId,
      dto,
    );

    this.eventEmitter.emit(NEGOTIATION_PROPOSED_EVENT, {
      seasonId,
      targetUserId: negotiation.targetSquad.user.id,
      negotiationId: negotiation.id,
      proposingTeamName: negotiation.proposingSquad.team.name,
    });

    return negotiation;
  }

  async accept(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    const negotiation = await this.acceptNegotiationUseCase.execute(
      seasonId,
      userId,
      negotiationId,
    );

    this.eventEmitter.emit(NEGOTIATION_ACCEPTED_EVENT, {
      seasonId,
      proposingUserId: negotiation.proposingSquad.user.id,
      negotiationId: negotiation.id,
      targetTeamName: negotiation.targetSquad.team.name,
    });

    return negotiation;
  }

  async reject(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    const negotiation = await this.rejectNegotiationUseCase.execute(
      seasonId,
      userId,
      negotiationId,
    );

    this.eventEmitter.emit(NEGOTIATION_REJECTED_EVENT, {
      seasonId,
      proposingUserId: negotiation.proposingSquad.user.id,
      negotiationId: negotiation.id,
      targetTeamName: negotiation.targetSquad.team.name,
    });

    return negotiation;
  }

  listForSquad(
    seasonId: string,
    userId: string,
    direction: NegotiationDirection,
  ): Promise<NegotiationResponseDTO[]> {
    return this.listNegotiationsUseCase.execute(seasonId, userId, direction);
  }
}
