import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AuthenticatedUser } from '../../auth/types';
import { UsersRepository } from '../../users/users.repository';
import { CreateTransferRequestDTO, TransferResponseDTO } from '../dto';
import { TransfersRepository } from '../transfers.repository';
import { ResolveTransferUseCase } from './resolve-transfer.use-case';

@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly resolveTransferUseCase: ResolveTransferUseCase,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    actingUser: AuthenticatedUser,
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    const { squad, outgoing, incoming, cost, balance, useCoupon, feeEnabled } =
      await this.resolveTransferUseCase.execute(seasonId, actingUser, dto);

    if (balance < cost) {
      throw new ConflictException(
        `Saldo insuficiente: a troca custa ${cost} moedas e seu saldo é ${balance}`,
      );
    }

    const requestedByUserId = await this.resolveRequestedByUserId(
      actingUser,
      dto.requestedByUserId,
    );

    return this.transfersRepository.swap(
      seasonId,
      outgoing,
      incoming,
      requestedByUserId,
      squad.id,
      cost,
      useCoupon,
      feeEnabled,
    );
  }

  // Só admin pode atribuir a transferência a outra pessoa — participante
  // sempre aparece como o próprio solicitante (ver RequireRole no front).
  private async resolveRequestedByUserId(
    actingUser: AuthenticatedUser,
    requestedByUserId: string | undefined,
  ): Promise<string> {
    if (actingUser.role !== 'ADMIN' || !requestedByUserId) {
      return actingUser.id;
    }

    const requestedByUser =
      await this.usersRepository.findById(requestedByUserId);
    if (!requestedByUser) {
      throw new NotFoundException('Solicitante não encontrado');
    }

    return requestedByUser.id;
  }
}
