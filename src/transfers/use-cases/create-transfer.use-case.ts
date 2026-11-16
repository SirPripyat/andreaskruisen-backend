import { ConflictException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { CreateTransferRequestDTO, TransferResponseDTO } from '../dto';
import { TransfersRepository } from '../transfers.repository';
import { ResolveTransferUseCase } from './resolve-transfer.use-case';

@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly resolveTransferUseCase: ResolveTransferUseCase,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    userId: string,
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    const { squad, outgoing, incoming, cost, balance, useCoupon } =
      await this.resolveTransferUseCase.execute(seasonId, userId, dto);

    if (balance < cost) {
      throw new ConflictException(
        `Saldo insuficiente: a troca custa ${cost} moedas e seu saldo é ${balance}`,
      );
    }

    return this.transfersRepository.swap(
      seasonId,
      outgoing,
      incoming,
      userId,
      squad.id,
      cost,
      useCoupon,
    );
  }
}
