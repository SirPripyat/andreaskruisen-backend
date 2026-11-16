import { Injectable } from '@nestjs/common';
import {
  CreateTransferRequestDTO,
  QuoteTransferResponseDTO,
  TransferPlayerMovementResponseDTO,
  TransferResponseDTO,
} from './dto';
import {
  CreateTransferUseCase,
  ListTransfersUseCase,
  QuoteTransferUseCase,
} from './use-cases';

@Injectable()
export class TransfersFacade {
  constructor(
    private readonly createTransferUseCase: CreateTransferUseCase,
    private readonly listTransfersUseCase: ListTransfersUseCase,
    private readonly quoteTransferUseCase: QuoteTransferUseCase,
  ) {}

  create(
    seasonId: string,
    userId: string,
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    return this.createTransferUseCase.execute(seasonId, userId, dto);
  }

  quote(
    seasonId: string,
    userId: string,
    dto: CreateTransferRequestDTO,
  ): Promise<QuoteTransferResponseDTO> {
    return this.quoteTransferUseCase.execute(seasonId, userId, dto);
  }

  findBySeason(seasonId: string): Promise<TransferPlayerMovementResponseDTO[]> {
    return this.listTransfersUseCase.execute(seasonId);
  }
}
