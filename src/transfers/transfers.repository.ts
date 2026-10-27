import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Transfer } from '../../generated/prisma/client';

export interface TransferTeamSummary {
  id: string;
  name: string;
  crestUrl: string;
}

export interface TransferPlayerSummary {
  id: string;
  name: string;
  photoUrl: string;
}

// O time atual de um jogador numa temporada: estado presente, derivado do
// PlayerTeamAssignment (ver schema), não de Player.teamId.
export interface TransferAssignment {
  player: TransferPlayerSummary;
  team: TransferTeamSummary;
}

export interface TransferWithRelations extends Transfer {
  requestedBy: { id: string; name: string };
  outgoingPlayer: TransferPlayerSummary;
  outgoingTeam: TransferTeamSummary;
  incomingPlayer: TransferPlayerSummary;
  incomingTeam: TransferTeamSummary;
}

const TRANSFER_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  outgoingPlayer: { select: { id: true, name: true, photoUrl: true } },
  outgoingTeam: { select: { id: true, name: true, crestUrl: true } },
  incomingPlayer: { select: { id: true, name: true, photoUrl: true } },
  incomingTeam: { select: { id: true, name: true, crestUrl: true } },
} as const;

@Injectable()
export class TransfersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findAssignment(
    seasonId: string,
    playerId: string,
  ): Promise<TransferAssignment | null> {
    return this.txHost.tx.playerTeamAssignment.findUnique({
      where: { seasonId_playerId: { seasonId, playerId } },
      select: {
        player: { select: { id: true, name: true, photoUrl: true } },
        team: { select: { id: true, name: true, crestUrl: true } },
      },
    });
  }

  // Atualiza a "foto" de cada jogador pro time do outro (ver comentário no
  // model PlayerTeamAssignment) e registra o log da troca na mesma transação.
  async swap(
    seasonId: string,
    outgoing: TransferAssignment,
    incoming: TransferAssignment,
    requestedByUserId: string,
  ): Promise<TransferWithRelations> {
    await this.txHost.tx.playerTeamAssignment.update({
      where: {
        seasonId_playerId: { seasonId, playerId: outgoing.player.id },
      },
      data: { teamId: incoming.team.id },
    });
    await this.txHost.tx.playerTeamAssignment.update({
      where: {
        seasonId_playerId: { seasonId, playerId: incoming.player.id },
      },
      data: { teamId: outgoing.team.id },
    });

    return this.txHost.tx.transfer.create({
      data: {
        seasonId,
        requestedByUserId,
        outgoingPlayerId: outgoing.player.id,
        outgoingTeamId: outgoing.team.id,
        incomingPlayerId: incoming.player.id,
        incomingTeamId: incoming.team.id,
      },
      include: TRANSFER_INCLUDE,
    });
  }

  findBySeason(seasonId: string): Promise<TransferWithRelations[]> {
    return this.txHost.tx.transfer.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
      include: TRANSFER_INCLUDE,
    });
  }
}
