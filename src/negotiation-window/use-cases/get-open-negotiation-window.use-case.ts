import { Injectable } from '@nestjs/common';
import { NegotiationWindowRepository } from '../negotiation-window.repository';
import { OpenNegotiationWindow } from '../types';

// Guard usado por ResolveTransferUseCase (mercado tradicional) e
// AcceptNegotiationUseCase (negociações diretas) — mesmo papel que
// HasActiveTournamentUseCase, mas também devolve o feeEnabled decidido na
// abertura, pra elas calcularem o custo/taxa certos.
@Injectable()
export class GetOpenNegotiationWindowUseCase {
  constructor(
    private readonly negotiationWindowRepository: NegotiationWindowRepository,
  ) {}

  execute(seasonId: string): Promise<OpenNegotiationWindow | null> {
    return this.negotiationWindowRepository.findOpen(seasonId);
  }
}
