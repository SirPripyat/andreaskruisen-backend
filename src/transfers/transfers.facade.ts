import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '../auth/types';
import { TRANSFER_COMPLETED_EVENT } from '../notifications/events';
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    seasonId: string,
    actingUser: AuthenticatedUser,
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    const transfer = await this.createTransferUseCase.execute(
      seasonId,
      actingUser,
      dto,
    );

    // Notifica o solicitante (requestedBy), não quem clicou em "registrar" —
    // quando é o admin criando em nome de outra pessoa, é essa pessoa que
    // precisa saber que a transferência aconteceu. Com troca multi-jogador
    // (ver v1-transferencias.md), cada nome vira uma lista separada por
    // vírgula.
    this.eventEmitter.emit(TRANSFER_COMPLETED_EVENT, {
      seasonId,
      userId: transfer.requestedBy.id,
      transferId: transfer.id,
      outgoingPlayerName: transfer.outgoingPlayers
        .map((player) => player.name)
        .join(', '),
      incomingPlayerName: transfer.incomingPlayers
        .map((player) => player.name)
        .join(', '),
      cost: transfer.cost,
    });

    return transfer;
  }

  quote(
    seasonId: string,
    actingUser: AuthenticatedUser,
    dto: CreateTransferRequestDTO,
  ): Promise<QuoteTransferResponseDTO> {
    return this.quoteTransferUseCase.execute(seasonId, actingUser, dto);
  }

  findBySeason(seasonId: string): Promise<TransferPlayerMovementResponseDTO[]> {
    return this.listTransfersUseCase.execute(seasonId);
  }
}
