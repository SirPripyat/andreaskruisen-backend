import { Injectable, NotFoundException } from '@nestjs/common';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { TransferPlayerMovementResponseDTO, TransferResponseDTO } from '../dto';
import { TransfersRepository } from '../transfers.repository';

@Injectable()
export class ListTransfersUseCase {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(
    seasonId: string,
  ): Promise<TransferPlayerMovementResponseDTO[]> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) throw new NotFoundException('Temporada não encontrada');

    const transfers = await this.transfersRepository.findBySeason(seasonId);
    return transfers.flatMap((transfer) => this.toPlayerMovements(transfer));
  }

  // Mercado tradicional sempre tem os dois lados (troca completa) e gera 2
  // movimentos; negociação direta pode ser compra/venda pura (ver
  // Transfer.outgoing/incomingPlayerId nullable) e gera só 1.
  private toPlayerMovements(
    transfer: TransferResponseDTO,
  ): TransferPlayerMovementResponseDTO[] {
    const movements: TransferPlayerMovementResponseDTO[] = [];

    if (transfer.outgoingPlayer) {
      movements.push({
        transferId: transfer.id,
        player: transfer.outgoingPlayer,
        fromTeam: transfer.outgoingTeam,
        toTeam: transfer.incomingTeam,
        requestedBy: transfer.requestedBy,
        date: transfer.createdAt,
        cost: transfer.cost,
        originType: transfer.originType,
      });
    }

    if (transfer.incomingPlayer) {
      movements.push({
        transferId: transfer.id,
        player: transfer.incomingPlayer,
        fromTeam: transfer.incomingTeam,
        toTeam: transfer.outgoingTeam,
        requestedBy: transfer.requestedBy,
        date: transfer.createdAt,
        cost: transfer.cost,
        originType: transfer.originType,
      });
    }

    return movements;
  }
}
