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

  // Mercado tradicional sempre tem pelo menos 1 jogador de cada lado
  // (podendo ter até 2 numa troca multi-jogador, ver
  // v1-transferencias.md) e gera 1 movimento por jogador; negociação
  // direta pode ser compra/venda pura (listas vazias de um dos lados).
  private toPlayerMovements(
    transfer: TransferResponseDTO,
  ): TransferPlayerMovementResponseDTO[] {
    const toMovement = (
      player: TransferResponseDTO['outgoingPlayers'][number],
      fromTeam: TransferResponseDTO['outgoingTeam'],
      toTeam: TransferResponseDTO['incomingTeam'],
    ): TransferPlayerMovementResponseDTO => ({
      transferId: transfer.id,
      player,
      fromTeam,
      toTeam,
      requestedBy: transfer.requestedBy,
      date: transfer.createdAt,
      cost: transfer.cost,
      originType: transfer.originType,
    });

    return [
      ...transfer.outgoingPlayers.map((player) =>
        toMovement(player, transfer.outgoingTeam, transfer.incomingTeam),
      ),
      ...transfer.incomingPlayers.map((player) =>
        toMovement(player, transfer.incomingTeam, transfer.outgoingTeam),
      ),
    ];
  }
}
