import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRole } from '../../../generated/prisma/client';
import { SquadsRepository } from '../../squads/squads.repository';
import { UsersRepository } from '../../users/users.repository';
import {
  AUDIT_DISCREPANCY_FOUND_EVENT,
  AuditDiscrepancyFoundEvent,
  NEGOTIATION_ACCEPTED_EVENT,
  NEGOTIATION_PROPOSED_EVENT,
  NEGOTIATION_REJECTED_EVENT,
  NegotiationAcceptedEvent,
  NegotiationProposedEvent,
  NegotiationRejectedEvent,
  SEASON_STARTED_EVENT,
  SeasonStartedEvent,
  TOURNAMENT_PRIZE_AWARDED_EVENT,
  TournamentPrizeAwardedEvent,
  TRANSFER_COMPLETED_EVENT,
  TransferCompletedEvent,
} from '../events';
import { CreateNotificationUseCase } from '../use-cases';
import { tournamentPrizeLabel } from '../utils';

@Injectable()
export class NotificationEventsListener {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly squadsRepository: SquadsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  @OnEvent(TRANSFER_COMPLETED_EVENT)
  async handleTransferCompleted(event: TransferCompletedEvent): Promise<void> {
    await this.createNotificationUseCase.execute({
      seasonId: event.seasonId,
      userId: event.userId,
      type: 'TRANSFER_COMPLETED',
      title: 'Transferência concluída',
      message: `${event.outgoingPlayerName} saiu e ${event.incomingPlayerName} entrou, por ${event.cost} moeda(s).`,
      metadata: { transferId: event.transferId },
    });
  }

  @OnEvent(TOURNAMENT_PRIZE_AWARDED_EVENT)
  async handleTournamentPrizeAwarded(
    event: TournamentPrizeAwardedEvent,
  ): Promise<void> {
    const userId = await this.squadsRepository.findUserIdById(event.squadId);
    if (!userId) return;

    await this.createNotificationUseCase.execute({
      seasonId: event.seasonId,
      userId,
      type: 'TOURNAMENT_PRIZE_AWARDED',
      title: 'Moedas recebidas',
      message: `Seu time recebeu ${event.amount} moeda(s) de prêmio (${tournamentPrizeLabel(event.type)}).`,
      metadata: {
        squadId: event.squadId,
        amount: event.amount,
        prizeType: event.type,
        phaseId: event.phaseId ?? null,
        matchId: event.matchId ?? null,
      },
    });
  }

  @OnEvent(NEGOTIATION_PROPOSED_EVENT)
  async handleNegotiationProposed(
    event: NegotiationProposedEvent,
  ): Promise<void> {
    await this.createNotificationUseCase.execute({
      seasonId: event.seasonId,
      userId: event.targetUserId,
      type: 'NEGOTIATION_PROPOSED',
      title: 'Nova proposta de negociação',
      message: `${event.proposingTeamName} te enviou uma proposta de negociação.`,
      metadata: { negotiationId: event.negotiationId },
    });
  }

  @OnEvent(NEGOTIATION_ACCEPTED_EVENT)
  async handleNegotiationAccepted(
    event: NegotiationAcceptedEvent,
  ): Promise<void> {
    await this.createNotificationUseCase.execute({
      seasonId: event.seasonId,
      userId: event.proposingUserId,
      type: 'NEGOTIATION_ACCEPTED',
      title: 'Proposta aceita',
      message: `${event.targetTeamName} aceitou sua proposta de negociação.`,
      metadata: { negotiationId: event.negotiationId },
    });
  }

  @OnEvent(NEGOTIATION_REJECTED_EVENT)
  async handleNegotiationRejected(
    event: NegotiationRejectedEvent,
  ): Promise<void> {
    await this.createNotificationUseCase.execute({
      seasonId: event.seasonId,
      userId: event.proposingUserId,
      type: 'NEGOTIATION_REJECTED',
      title: 'Proposta rejeitada',
      message: `${event.targetTeamName} rejeitou sua proposta de negociação.`,
      metadata: { negotiationId: event.negotiationId },
    });
  }

  @OnEvent(SEASON_STARTED_EVENT)
  async handleSeasonStarted(event: SeasonStartedEvent): Promise<void> {
    const squads = await this.squadsRepository.findAllForSeason(event.seasonId);

    await Promise.all(
      squads.map((squad) =>
        this.createNotificationUseCase.execute({
          seasonId: event.seasonId,
          userId: squad.user.id,
          type: 'SEASON_STARTED',
          title: 'Temporada iniciada',
          message: `A temporada ${event.seasonName} começou.`,
          metadata: { seasonId: event.seasonId },
        }),
      ),
    );
  }

  @OnEvent(AUDIT_DISCREPANCY_FOUND_EVENT)
  async handleAuditDiscrepancyFound(
    event: AuditDiscrepancyFoundEvent,
  ): Promise<void> {
    const admins = await this.usersRepository.findAllByRole(UserRole.ADMIN);

    await Promise.all(
      admins.map((admin) =>
        this.createNotificationUseCase.execute({
          seasonId: event.seasonId,
          userId: admin.id,
          type: 'AUDIT_DISCREPANCY_FOUND',
          title: 'Auditoria encontrou divergência',
          message: `A auditoria encontrou ${event.findingsCount} divergência(s) nesta temporada.`,
          metadata: {
            seasonId: event.seasonId,
            findingsCount: event.findingsCount,
          },
        }),
      ),
    );
  }
}
