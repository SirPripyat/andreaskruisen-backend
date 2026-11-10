import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Squad } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../../squads/squads.repository';
import { HasActiveTournamentUseCase } from '../../tournaments/use-cases';
import { CreateTransfer } from '../dto';
import { TransfersRepository } from '../transfers.repository';
import { TransferAssignment, TransferWithRelations } from '../types';

@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly hasActiveTournamentUseCase: HasActiveTournamentUseCase,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    userId: string,
    dto: CreateTransfer,
  ): Promise<TransferWithRelations> {
    await this.ensureSeasonExists(seasonId);
    await this.ensureNoActiveTournament(seasonId);

    const squad = await this.getSquadOrThrow(userId, seasonId);
    const outgoing = await this.getOutgoingAssignmentOrThrow(
      seasonId,
      dto.outgoingPlayerId,
      squad,
    );
    const incoming = await this.getIncomingAssignmentOrThrow(
      seasonId,
      dto.incomingPlayerId,
      outgoing,
    );

    return this.transfersRepository.swap(seasonId, outgoing, incoming, userId);
  }

  private async ensureSeasonExists(seasonId: string): Promise<void> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');
  }

  private async ensureNoActiveTournament(seasonId: string): Promise<void> {
    const hasActiveTournament =
      await this.hasActiveTournamentUseCase.execute(seasonId);

    if (!hasActiveTournament) return;

    throw new ConflictException(
      'Transferências só são permitidas quando não há torneio em andamento nessa temporada',
    );
  }

  private async getSquadOrThrow(
    userId: string,
    seasonId: string,
  ): Promise<Squad> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    return squad;
  }

  private async getOutgoingAssignmentOrThrow(
    seasonId: string,
    playerId: string,
    squad: Squad,
  ): Promise<TransferAssignment> {
    const outgoing = await this.transfersRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!outgoing)
      throw new NotFoundException(
        'Jogador que sai não encontrado nessa temporada',
      );

    if (outgoing.team.id !== squad.teamId)
      throw new ForbiddenException('Esse jogador não está no seu time');

    return outgoing;
  }

  private async getIncomingAssignmentOrThrow(
    seasonId: string,
    playerId: string,
    outgoing: TransferAssignment,
  ): Promise<TransferAssignment> {
    const incoming = await this.transfersRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!incoming)
      throw new NotFoundException(
        'Jogador que entra não encontrado nessa temporada',
      );

    if (incoming.team.id === outgoing.team.id)
      throw new BadRequestException('Os jogadores já estão no mesmo time');

    return incoming;
  }
}
