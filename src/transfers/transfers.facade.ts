import { Injectable } from '@nestjs/common';
import {
  CreateTransferRequestDTO,
  TransferPlayerMovementResponseDTO,
  TransferResponseDTO,
} from './dto';
import { CreateTransferUseCase, ListTransfersUseCase } from './use-cases';

@Injectable()
export class TransfersFacade {
  constructor(
    private readonly createTransferUseCase: CreateTransferUseCase,
    private readonly listTransfersUseCase: ListTransfersUseCase,
  ) {}

  create(
    seasonId: string,
    userId: string,
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    return this.createTransferUseCase.execute(seasonId, userId, dto);
  }

  findBySeason(seasonId: string): Promise<TransferPlayerMovementResponseDTO[]> {
    return this.listTransfersUseCase.execute(seasonId);
  }
}
