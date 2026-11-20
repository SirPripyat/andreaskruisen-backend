import { ConflictException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { NegotiationWindowResponseDTO } from '../dto/response';
import { NegotiationWindowRepository } from '../negotiation-window.repository';

@Injectable()
export class CloseNegotiationWindowUseCase {
  constructor(
    private readonly negotiationWindowRepository: NegotiationWindowRepository,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    userId: string,
  ): Promise<NegotiationWindowResponseDTO> {
    const open = await this.negotiationWindowRepository.findOpen(seasonId);

    if (!open)
      throw new ConflictException(
        'Não há janela de negociação aberta nessa temporada',
      );

    return this.negotiationWindowRepository.close(open.id, userId);
  }
}
