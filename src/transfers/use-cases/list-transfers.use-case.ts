import { Injectable, NotFoundException } from '@nestjs/common';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { TransfersRepository } from '../transfers.repository';
import { TransferPlayerMovement, TransferWithRelations } from '../types';

@Injectable()
export class ListTransfersUseCase {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(seasonId: string): Promise<TransferPlayerMovement[]> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    const transfers = await this.transfersRepository.findBySeason(seasonId);
    return transfers.flatMap((transfer) => this.toPlayerMovements(transfer));
  }

  private toPlayerMovements(
    transfer: TransferWithRelations,
  ): [TransferPlayerMovement, TransferPlayerMovement] {
    return [
      {
        transferId: transfer.id,
        player: transfer.outgoingPlayer,
        fromTeam: transfer.outgoingTeam,
        toTeam: transfer.incomingTeam,
        requestedBy: transfer.requestedBy,
        date: transfer.createdAt,
      },
      {
        transferId: transfer.id,
        player: transfer.incomingPlayer,
        fromTeam: transfer.incomingTeam,
        toTeam: transfer.outgoingTeam,
        requestedBy: transfer.requestedBy,
        date: transfer.createdAt,
      },
    ];
  }
}
