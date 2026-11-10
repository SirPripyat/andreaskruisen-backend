import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Player, PrismaClient } from '../../generated/prisma/client';
import { PaginationQuery, paginate } from '../commons/pagination';
import {
  PLAYER_ORDER_BY_FIELD,
  PlayerImportSnapshot,
  PlayerPositionInput,
  PlayerRatingInput,
  PlayersSort,
  PlayerTeamDimension,
  UpsertPlayerData,
} from './types';

@Injectable()
export class PlayersRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  // Igual findPaginatedForSeason: o time exibido é a "foto" da temporada
  // (PlayerTeamAssignment), não o Player.teamId real. seasonAssignments
  // vazio = jogador não faz parte dessa temporada (ex.: importado depois
  // dela ter começado, nunca "fotografado" — ver seedPlayerAssignmentsFromRealTeams).
  findByIdForSeason(seasonId: string, id: string) {
    return this.txHost.tx.player.findUnique({
      where: { id },
      include: {
        nationality: true,
        positions: true,
        ratings: { orderBy: { capturedAt: 'desc' }, take: 1 },
        seasonAssignments: {
          where: { seasonId },
          include: { team: true },
        },
        _count: { select: { goalsScored: true, goalsAssisted: true } },
      },
    });
  }

  findPaginated(
    filter: { name?: string },
    sort: PlayersSort,
    pagination: PaginationQuery,
  ) {
    const where = filter.name
      ? { name: { contains: filter.name, mode: 'insensitive' as const } }
      : {};
    const orderBy = {
      [PLAYER_ORDER_BY_FIELD[sort.sortBy]]: sort.sortOrder,
    };

    return paginate(
      () => this.txHost.tx.player.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.player.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            team: true,
            nationality: true,
            positions: true,
            ratings: { orderBy: { capturedAt: 'desc' }, take: 1 },
          },
        }),
      pagination,
    );
  }

  findPaginatedForSeason(
    seasonId: string,
    filter: { name?: string },
    sort: PlayersSort,
    pagination: PaginationQuery,
  ) {
    const where = {
      seasonId,
      ...(filter.name
        ? {
            player: {
              name: { contains: filter.name, mode: 'insensitive' as const },
            },
          }
        : {}),
    };
    const orderBy = {
      player: { [PLAYER_ORDER_BY_FIELD[sort.sortBy]]: sort.sortOrder },
    };

    return paginate(
      () => this.txHost.tx.playerTeamAssignment.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.playerTeamAssignment.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            team: true,
            player: {
              include: {
                nationality: true,
                positions: true,
                ratings: { orderBy: { capturedAt: 'desc' }, take: 1 },
              },
            },
          },
        }),
      pagination,
    );
  }

  upsertByEaId(data: UpsertPlayerData): Promise<Player> {
    return this.txHost.tx.player.upsert({
      where: { eaId: data.eaId },
      create: data,
      update: {
        name: data.name,
        photoUrl: data.photoUrl,
        birthdate: data.birthdate,
        preferredFoot: data.preferredFoot,
        nationalityId: data.nationalityId,
        teamId: data.teamId,
        latestOverallRating: data.latestOverallRating,
      },
    });
  }

  async replacePositions(
    playerId: string,
    positions: PlayerPositionInput[],
  ): Promise<void> {
    await this.txHost.tx.$transaction([
      this.txHost.tx.playerPosition.deleteMany({ where: { playerId } }),
      this.txHost.tx.playerPosition.createMany({
        data: positions.map((position) => ({ playerId, ...position })),
      }),
    ]);
  }

  async findImportSnapshotsByEaIds(
    eaIds: number[],
  ): Promise<Map<number, PlayerImportSnapshot>> {
    const players = await this.txHost.tx.player.findMany({
      where: { eaId: { in: eaIds } },
      select: {
        eaId: true,
        positions: { select: { position: true, isPrimary: true } },
        ratings: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
    });

    return new Map(
      players.map((player) => [
        player.eaId,
        {
          positions: player.positions,
          latestRating: player.ratings[0] ?? null,
        },
      ]),
    );
  }

  async findTeamDimensionsByEaIds(
    eaIds: number[],
  ): Promise<Map<number, PlayerTeamDimension>> {
    const players = await this.txHost.tx.player.findMany({
      where: { eaId: { in: eaIds } },
      select: { id: true, eaId: true, teamId: true },
    });

    return new Map(
      players.map((player) => [
        player.eaId,
        { id: player.id, teamId: player.teamId },
      ]),
    );
  }

  async createRating(
    playerId: string,
    rating: PlayerRatingInput,
  ): Promise<void> {
    await this.txHost.tx.playerRating.create({
      data: { playerId, ...rating },
    });
  }
}
