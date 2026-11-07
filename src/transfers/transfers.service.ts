import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SeasonsRepository } from '../seasons/seasons.repository';
import { SquadsRepository } from '../squads/squads.repository';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateTransfer } from './dto/create-transfer.schema';
import {
  TransferPlayerSummary,
  TransfersRepository,
  TransferTeamSummary,
  TransferWithRelations,
} from './transfers.repository';

// Cada transferência troca dois jogadores entre dois times. O front exibe
// isso como o movimento de cada jogador (saiu de um time, foi pro outro),
// então uma transferência gera duas entradas aqui, uma por jogador.
export interface TransferPlayerMovement {
  transferId: string;
  player: TransferPlayerSummary;
  fromTeam: TransferTeamSummary;
  toTeam: TransferTeamSummary;
  requestedBy: { id: string; name: string };
  date: Date;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly tournamentsService: TournamentsService,
  ) {}

  // Sem custo por ora (ver CLAUDE.md): a troca só atualiza quem joga em
  // qual time nessa temporada. Só libera jogador do próprio elenco do
  // participante; o jogador que entra pode ser de qualquer outro time da
  // temporada (CPU ou de outro participante) — a troca é unilateral, sem
  // aprovação do outro lado.
  @Transactional()
  async create(
    seasonId: string,
    userId: string,
    dto: CreateTransfer,
  ): Promise<TransferWithRelations> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    if (await this.tournamentsService.hasActiveTournament(seasonId)) {
      throw new ConflictException(
        'Transferências só são permitidas quando não há torneio em andamento nessa temporada',
      );
    }

    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );
    if (!squad) {
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );
    }

    const outgoing = await this.transfersRepository.findAssignment(
      seasonId,
      dto.outgoingPlayerId,
    );
    if (!outgoing) {
      throw new NotFoundException(
        'Jogador que sai não encontrado nessa temporada',
      );
    }
    if (outgoing.team.id !== squad.teamId) {
      throw new ForbiddenException('Esse jogador não está no seu time');
    }

    const incoming = await this.transfersRepository.findAssignment(
      seasonId,
      dto.incomingPlayerId,
    );
    if (!incoming) {
      throw new NotFoundException(
        'Jogador que entra não encontrado nessa temporada',
      );
    }
    if (incoming.team.id === outgoing.team.id) {
      throw new BadRequestException('Os jogadores já estão no mesmo time');
    }

    return this.transfersRepository.swap(seasonId, outgoing, incoming, userId);
  }

  async findBySeason(seasonId: string): Promise<TransferPlayerMovement[]> {
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
