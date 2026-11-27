import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  CoinTransactionType,
  CouponTransactionType,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client';
import { TransfersRepository } from '../transfers/transfers.repository';
import { NegotiationResponseDTO } from './dto/response';
import {
  NegotiationAssignment,
  NegotiationClauseInput,
  NegotiationDirection,
  NegotiationWithTeams,
} from './types';

const NEGOTIATION_INCLUDE = {
  proposingSquad: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, crestUrl: true } },
    },
  },
  targetSquad: {
    select: {
      id: true,
      user: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, crestUrl: true } },
    },
  },
  // Até 2 jogadores de cada lado (troca multi-jogador, ver
  // v1-transferencias.md).
  outgoingPlayers: {
    select: { player: { select: { id: true, name: true, photoUrl: true } } },
  },
  incomingPlayers: {
    select: { player: { select: { id: true, name: true, photoUrl: true } } },
  },
  // Só existe depois do aceite (ver AcceptNegotiationUseCase) — é onde mora
  // o snapshot de overall/feeEnabled, que deixou de existir na própria
  // DirectNegotiation (ver Transfer.negotiationId).
  transfer: {
    select: {
      feeEnabled: true,
      outgoingPlayers: { select: { overall: true } },
      incomingPlayers: { select: { overall: true } },
    },
  },
  clauses: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      type: true,
      amount: true,
      matchesCount: true,
      terms: true,
      player: { select: { id: true, name: true, photoUrl: true } },
    },
  },
} as const;

type NegotiationWithRelations = Prisma.DirectNegotiationGetPayload<{
  include: typeof NEGOTIATION_INCLUDE;
}>;

const sumOveralls = (rows: Array<{ overall: number }>): number =>
  rows.reduce((sum, row) => sum + row.overall, 0);

const toResponseDTO = (
  raw: NegotiationWithRelations,
): NegotiationResponseDTO => {
  const {
    proposingSquad,
    targetSquad,
    outgoingPlayers,
    incomingPlayers,
    transfer,
    ...rest
  } = raw;

  return {
    ...rest,
    proposingSquad: {
      squadId: proposingSquad.id,
      user: proposingSquad.user,
      team: proposingSquad.team,
    },
    targetSquad: {
      squadId: targetSquad.id,
      user: targetSquad.user,
      team: targetSquad.team,
    },
    outgoingPlayers: outgoingPlayers.map((row) => row.player),
    incomingPlayers: incomingPlayers.map((row) => row.player),
    outgoingOverallSum: transfer ? sumOveralls(transfer.outgoingPlayers) : null,
    incomingOverallSum: transfer ? sumOveralls(transfer.incomingPlayers) : null,
    feeEnabled: transfer?.feeEnabled ?? null,
  } as NegotiationResponseDTO;
};

@Injectable()
export class NegotiationsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
    private readonly transfersRepository: TransfersRepository,
  ) {}

  async findAssignment(
    seasonId: string,
    playerId: string,
  ): Promise<NegotiationAssignment | null> {
    const assignment = await this.txHost.tx.playerTeamAssignment.findUnique({
      where: { seasonId_playerId: { seasonId, playerId } },
      select: {
        player: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            latestOverallRating: true,
            positions: { select: { position: true, isPrimary: true } },
          },
        },
        team: { select: { id: true, name: true, crestUrl: true } },
      },
    });

    if (!assignment) return null;

    const primary =
      assignment.player.positions.find((position) => position.isPrimary) ??
      assignment.player.positions[0];

    return {
      player: {
        id: assignment.player.id,
        name: assignment.player.name,
        photoUrl: assignment.player.photoUrl,
        overall: assignment.player.latestOverallRating,
      },
      team: assignment.team,
      position: primary?.position ?? 'ATA',
    };
  }

  // Mesmo princípio do ledger de moedas em TransfersRepository: o saldo
  // nunca é um campo, é sempre recalculado a partir das transações.
  async findSquadBalance(squadId: string): Promise<number> {
    const result = await this.txHost.tx.coinTransaction.aggregate({
      where: { squadId },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  create(data: {
    seasonId: string;
    proposingSquadId: string;
    targetSquadId: string;
    // Até 2 jogadores de cada lado (troca multi-jogador, ver
    // v1-transferencias.md) — vazio numa compra/venda pura.
    outgoingPlayerIds: string[];
    incomingPlayerIds: string[];
    coinAmount: number | null;
    clauses: NegotiationClauseInput[];
  }): Promise<NegotiationResponseDTO> {
    const {
      clauses,
      outgoingPlayerIds,
      incomingPlayerIds,
      ...negotiationData
    } = data;

    return this.txHost.tx.directNegotiation
      .create({
        data: {
          ...negotiationData,
          clauses: { create: clauses },
          outgoingPlayers: {
            create: outgoingPlayerIds.map((playerId) => ({ playerId })),
          },
          incomingPlayers: {
            create: incomingPlayerIds.map((playerId) => ({ playerId })),
          },
        },
        include: NEGOTIATION_INCLUDE,
      })
      .then(toResponseDTO);
  }

  async findByIdWithTeams(id: string): Promise<NegotiationWithTeams | null> {
    const negotiation = await this.txHost.tx.directNegotiation.findUnique({
      where: { id },
      include: {
        proposingSquad: { select: { teamId: true, userId: true } },
        targetSquad: { select: { teamId: true } },
        outgoingPlayers: { select: { playerId: true } },
        incomingPlayers: { select: { playerId: true } },
      },
    });

    if (!negotiation) return null;

    return {
      id: negotiation.id,
      seasonId: negotiation.seasonId,
      status: negotiation.status,
      proposingSquadId: negotiation.proposingSquadId,
      proposingTeamId: negotiation.proposingSquad.teamId,
      proposingUserId: negotiation.proposingSquad.userId,
      targetSquadId: negotiation.targetSquadId,
      targetTeamId: negotiation.targetSquad.teamId,
      outgoingPlayerIds: negotiation.outgoingPlayers.map((row) => row.playerId),
      incomingPlayerIds: negotiation.incomingPlayers.map((row) => row.playerId),
      coinAmount: negotiation.coinAmount,
    };
  }

  findForSquad(
    squadId: string,
    direction: NegotiationDirection,
  ): Promise<NegotiationResponseDTO[]> {
    return this.txHost.tx.directNegotiation
      .findMany({
        where:
          direction === 'sent'
            ? { proposingSquadId: squadId }
            : { targetSquadId: squadId },
        orderBy: { createdAt: 'desc' },
        include: NEGOTIATION_INCLUDE,
      })
      .then((negotiations) => negotiations.map(toResponseDTO));
  }

  reject(id: string): Promise<NegotiationResponseDTO> {
    return this.txHost.tx.directNegotiation
      .update({
        where: { id },
        data: { status: 'REJECTED', resolvedAt: new Date() },
        include: NEGOTIATION_INCLUDE,
      })
      .then(toResponseDTO);
  }

  // Delega a movimentação (PlayerTeamAssignment, titulares, Transfer e
  // ledger) pra TransfersRepository.record — a negociação aceita é a mesma
  // "tabela de fato" do mercado tradicional, só com originType diferente e
  // ligada de volta via negotiationId. Quem chama já resolveu valores e
  // elegibilidade (ver AcceptNegotiationUseCase).
  async accept(params: {
    seasonId: string;
    negotiationId: string;
    proposingTeamId: string;
    proposingUserId: string;
    targetTeamId: string;
    // Até 2 jogadores de cada lado (troca multi-jogador, ver
    // v1-transferencias.md) — vazio numa compra/venda pura.
    outgoing: NegotiationAssignment[];
    incoming: NegotiationAssignment[];
    feeEnabled: boolean;
    coinTransactions: Array<{
      squadId: string;
      type: CoinTransactionType;
      amount: number;
    }>;
    couponTransactions: Array<{
      squadId: string;
      type: CouponTransactionType;
      amount: number;
    }>;
  }): Promise<NegotiationResponseDTO> {
    await this.transfersRepository.record({
      seasonId: params.seasonId,
      originType: 'NEGOTIATION',
      requestedByUserId: params.proposingUserId,
      negotiationId: params.negotiationId,
      teamAId: params.proposingTeamId,
      teamBId: params.targetTeamId,
      outgoing: params.outgoing,
      incoming: params.incoming,
      feeEnabled: params.feeEnabled,
      coinTransactions: params.coinTransactions,
      couponTransactions: params.couponTransactions,
    });

    return this.txHost.tx.directNegotiation
      .update({
        where: { id: params.negotiationId },
        data: { status: 'ACCEPTED', resolvedAt: new Date() },
        include: NEGOTIATION_INCLUDE,
      })
      .then(toResponseDTO);
  }
}
