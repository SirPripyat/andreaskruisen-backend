import { ConflictException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { OpenNegotiationWindowRequestDTO } from '../dto/request';
import { NegotiationWindowResponseDTO } from '../dto/response';
import { NegotiationWindowRepository } from '../negotiation-window.repository';

@Injectable()
export class OpenNegotiationWindowUseCase {
  constructor(
    private readonly negotiationWindowRepository: NegotiationWindowRepository,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    userId: string,
    dto: OpenNegotiationWindowRequestDTO,
  ): Promise<NegotiationWindowResponseDTO> {
    const open = await this.negotiationWindowRepository.findOpen(seasonId);

    if (open)
      throw new ConflictException(
        'Já existe uma janela de negociação aberta nessa temporada',
      );

    return this.negotiationWindowRepository.open(
      seasonId,
      userId,
      dto.feeEnabled,
    );
  }
}
