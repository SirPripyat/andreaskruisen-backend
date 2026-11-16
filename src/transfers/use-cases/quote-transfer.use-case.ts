import { Injectable } from '@nestjs/common';
import { CreateTransferRequestDTO, QuoteTransferResponseDTO } from '../dto';
import { ResolveTransferUseCase } from './resolve-transfer.use-case';

@Injectable()
export class QuoteTransferUseCase {
  constructor(
    private readonly resolveTransferUseCase: ResolveTransferUseCase,
  ) {}

  async execute(
    seasonId: string,
    userId: string,
    dto: CreateTransferRequestDTO,
  ): Promise<QuoteTransferResponseDTO> {
    const { outgoing, incoming, cost, balance, useCoupon, couponBalance } =
      await this.resolveTransferUseCase.execute(seasonId, userId, dto);

    return {
      cost,
      balance,
      sufficientBalance: balance >= cost,
      outgoingPlayerOverall: outgoing.player.overall,
      incomingPlayerOverall: incoming.player.overall,
      couponBalance,
      useCoupon,
    };
  }
}
