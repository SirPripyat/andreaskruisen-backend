import { Injectable } from '@nestjs/common';
import { NegotiationWindowStatusResponseDTO } from '../dto/response';
import { NegotiationWindowRepository } from '../negotiation-window.repository';

@Injectable()
export class GetNegotiationWindowStatusUseCase {
  constructor(
    private readonly negotiationWindowRepository: NegotiationWindowRepository,
  ) {}

  async execute(seasonId: string): Promise<NegotiationWindowStatusResponseDTO> {
    const history =
      await this.negotiationWindowRepository.findHistory(seasonId);
    const open = history.find((window) => window.closedAt === null) ?? null;

    return { open, history };
  }
}
