import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PositionCode, PrismaClient } from '../../generated/prisma/client';
import { TransferAssignment, TransferWithRelations } from './types';

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

  async findAssignment(
    seasonId: string,
    playerId: string,
  ): Promise<TransferAssignment | null> {
    const assignment = await this.txHost.tx.playerTeamAssignment.findUnique({
      where: { seasonId_playerId: { seasonId, playerId } },
      select: {
        player: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            positions: { select: { position: true, isPrimary: true } },
          },
        },
        team: { select: { id: true, name: true, crestUrl: true } },
      },
    });
    if (!assignment) {
      return null;
    }

    const primary =
      assignment.player.positions.find((position) => position.isPrimary) ??
      assignment.player.positions[0];

    return {
      player: {
        id: assignment.player.id,
        name: assignment.player.name,
        photoUrl: assignment.player.photoUrl,
      },
      team: assignment.team,
      position: primary?.position ?? 'ATA',
    };
  }

  // Atualiza a "foto" de cada jogador pro time do outro (ver comentário no
  // model PlayerTeamAssignment) e registra o log da troca na mesma transação.
  // Titular/banco não é um atributo que o jogador carrega consigo: depois da
  // troca, recalcula quem é titular em cada posição afetada, em cada time,
  // com base no elenco atual (ver recomputeStartersForPosition) — assim
  // nenhum time acumula titulares de mais nem fica sem cobrir uma posição.
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

    // As duas posições envolvidas (podem ser a mesma) são as únicas cujo
    // conjunto de candidatos mudou em cada time — todo o resto do elenco
    // continua igual, então recalcular só elas é suficiente e correto.
    const affectedPositions = [
      ...new Set([outgoing.position, incoming.position]),
    ];
    for (const teamId of [outgoing.team.id, incoming.team.id]) {
      for (const position of affectedPositions) {
        await this.recomputeStartersForPosition(seasonId, teamId, position);
      }
      // O elenco pode não ter, numa posição, jogador suficiente cuja posição
      // PRINCIPAL bata exatamente com o slot da formação (ela admite
      // preenchimento por outra posição — ver comentário no TeamLineupSlot).
      // Sem isso, o recálculo por posição isolado pode deixar o time abaixo
      // dos 11 titulares, violando o invariante.
      await this.topUpStarters(seasonId, teamId);
    }

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

  // Titulares de uma posição = os N melhores (maior overall) do elenco
  // atual do time nessa posição, onde N é quantos slots dessa posição o
  // time tem na formação real (TeamLineupSlot, ver schema) — não quem
  // ocupava o slot antes. Reaplicado após toda troca que afete a posição
  // (ver swap), então um time nunca acumula titulares de mais numa posição
  // nem fica sem cobrir uma: o melhor disponível sempre assume a vaga.
  private async recomputeStartersForPosition(
    seasonId: string,
    teamId: string,
    position: PositionCode,
  ): Promise<void> {
    const [requiredSlots, candidates] = await Promise.all([
      this.txHost.tx.teamLineupSlot.count({ where: { teamId, position } }),
      this.txHost.tx.playerTeamAssignment.findMany({
        where: {
          seasonId,
          teamId,
          player: { positions: { some: { isPrimary: true, position } } },
        },
        select: { playerId: true },
        orderBy: { player: { latestOverallRating: 'desc' } },
      }),
    ]);

    const starterIds = candidates
      .slice(0, requiredSlots)
      .map((candidate) => candidate.playerId);
    const benchIds = candidates
      .slice(requiredSlots)
      .map((candidate) => candidate.playerId);

    if (starterIds.length > 0) {
      await this.txHost.tx.playerTeamAssignment.updateMany({
        where: { seasonId, teamId, playerId: { in: starterIds } },
        data: { isStarter: true },
      });
    }
    if (benchIds.length > 0) {
      await this.txHost.tx.playerTeamAssignment.updateMany({
        where: { seasonId, teamId, playerId: { in: benchIds } },
        data: { isStarter: false },
      });
    }
  }

  // Rede de segurança do invariante "sempre 11 titulares": se o recálculo
  // por posição deixou o time com menos titulares do que sua formação real
  // exige no total, promove os melhores reservas por overall (de qualquer
  // posição) até fechar a conta — mesma ideia de fallback já usada na
  // importação da escalação real (ver comentário no TeamLineupSlot).
  private async topUpStarters(seasonId: string, teamId: string): Promise<void> {
    const [requiredTotal, currentStarters, bench] = await Promise.all([
      this.txHost.tx.teamLineupSlot.count({ where: { teamId } }),
      this.txHost.tx.playerTeamAssignment.count({
        where: { seasonId, teamId, isStarter: true },
      }),
      this.txHost.tx.playerTeamAssignment.findMany({
        where: { seasonId, teamId, isStarter: false },
        select: { playerId: true },
        orderBy: { player: { latestOverallRating: 'desc' } },
      }),
    ]);

    const shortfall = requiredTotal - currentStarters;
    if (shortfall <= 0) {
      return;
    }

    const promotedIds = bench
      .slice(0, shortfall)
      .map((candidate) => candidate.playerId);
    if (promotedIds.length > 0) {
      await this.txHost.tx.playerTeamAssignment.updateMany({
        where: { seasonId, teamId, playerId: { in: promotedIds } },
        data: { isStarter: true },
      });
    }
  }

  findBySeason(seasonId: string): Promise<TransferWithRelations[]> {
    return this.txHost.tx.transfer.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
      include: TRANSFER_INCLUDE,
    });
  }
}
