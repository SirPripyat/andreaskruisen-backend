import { Injectable } from '@nestjs/common';
import { ProposeNegotiationRequestDTO } from './dto';
import { NegotiationResponseDTO } from './dto/response';
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
  ) {}

  propose(
    seasonId: string,
    userId: string,
    dto: ProposeNegotiationRequestDTO,
  ): Promise<NegotiationResponseDTO> {
    return this.proposeNegotiationUseCase.execute(seasonId, userId, dto);
  }

  accept(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    return this.acceptNegotiationUseCase.execute(
      seasonId,
      userId,
      negotiationId,
    );
  }

  reject(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    return this.rejectNegotiationUseCase.execute(
      seasonId,
      userId,
      negotiationId,
    );
  }

  listForSquad(
    seasonId: string,
    userId: string,
  ): Promise<NegotiationResponseDTO[]> {
    return this.listNegotiationsUseCase.execute(seasonId, userId);
  }
}
