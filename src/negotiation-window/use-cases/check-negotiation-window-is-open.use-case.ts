import { Injectable } from '@nestjs/common';
import { NegotiationWindowIsOpenResponseDTO } from '../dto/response';
import { GetOpenNegotiationWindowUseCase } from './get-open-negotiation-window.use-case';

@Injectable()
export class CheckNegotiationWindowIsOpenUseCase {
  constructor(
    private readonly getOpenNegotiationWindowUseCase: GetOpenNegotiationWindowUseCase,
  ) {}

  async execute(seasonId: string): Promise<NegotiationWindowIsOpenResponseDTO> {
    const open = await this.getOpenNegotiationWindowUseCase.execute(seasonId);

    return { isOpen: open !== null };
  }
}
