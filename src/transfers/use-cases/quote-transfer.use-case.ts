import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/types';
import { CreateTransferRequestDTO, QuoteTransferResponseDTO } from '../dto';
import { ResolveTransferUseCase } from './resolve-transfer.use-case';

@Injectable()
export class QuoteTransferUseCase {
  constructor(
    private readonly resolveTransferUseCase: ResolveTransferUseCase,
  ) {}

  async execute(
    seasonId: string,
    actingUser: AuthenticatedUser,
    dto: CreateTransferRequestDTO,
  ): Promise<QuoteTransferResponseDTO> {
    const {
      outgoing,
      incoming,
      cost,
      balance,
      useCoupon,
      couponBalance,
      feeEnabled,
    } = await this.resolveTransferUseCase.execute(seasonId, actingUser, dto);

    return {
      cost,
      balance,
      sufficientBalance: balance >= cost,
      outgoingOverallSum: outgoing.reduce(
        (sum, assignment) => sum + assignment.player.overall,
        0,
      ),
      incomingOverallSum: incoming.reduce(
        (sum, assignment) => sum + assignment.player.overall,
        0,
      ),
      couponBalance,
      useCoupon,
      feeEnabled,
    };
  }
}
