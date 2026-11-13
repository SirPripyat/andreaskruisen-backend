import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  Player,
  PositionCode,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client';
import { normalizeSearchTerm } from '../commons/normalize-search-term';
import { PaginationQuery, paginate } from '../commons/pagination';
import {
  PLAYER_ORDER_BY_FIELD,
  PlayerImportSnapshot,
  PlayerPositionInput,
  PlayerRatingInput,
  PlayersFilter,
  PlayersSort,
  PlayerTeamDimension,
  SkillRatingRanges,
  UpsertPlayerData,
} from './types';
import { ageRangeToBirthdateRange } from './utils';

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

  async findPaginated(
    filter: PlayersFilter,
    sort: PlayersSort,
    pagination: PaginationQuery,
  ) {
    const playerWhere = await this.buildPlayerWhere(filter);
    const where: Prisma.PlayerWhereInput = {
      ...playerWhere,
      ...(filter.clubId ? { teamId: filter.clubId } : {}),
      ...(filter.leagueId ? { team: { leagueId: filter.leagueId } } : {}),
    };
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

  // Candidatos à similaridade: mesma restrição de "foto" da temporada que
  // findPaginatedForSeason, mas filtrando por posição primária (grupo
  // tático) em vez de paginação/filtros livres.
  findCandidatesForSimilarityInSeason(
    seasonId: string,
    excludePlayerId: string,
    primaryPositions: readonly PositionCode[],
  ) {
    return this.txHost.tx.playerTeamAssignment.findMany({
      where: {
        seasonId,
        playerId: { not: excludePlayerId },
        player: {
          positions: {
            some: {
              isPrimary: true,
              position: { in: [...primaryPositions] },
            },
          },
        },
      },
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
    });
  }

  async findPaginatedForSeason(
    seasonId: string,
    filter: PlayersFilter,
    sort: PlayersSort,
    pagination: PaginationQuery,
  ) {
    const playerWhere = await this.buildPlayerWhere(filter);
    const where: Prisma.PlayerTeamAssignmentWhereInput = {
      seasonId,
      ...(filter.clubId ? { teamId: filter.clubId } : {}),
      ...(filter.leagueId ? { team: { leagueId: filter.leagueId } } : {}),
      player: playerWhere,
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

  // Monta a parte do filtro que vive no próprio Player (nome, país,
  // posições, perna boa, idade, overall e habilidades) — comum aos dois
  // métodos acima, que só diferem em como aninham isso (direto vs. sob
  // `player:`, já que o time exibido na temporada é o da PlayerTeamAssignment,
  // não o Player.teamId).
  private async buildPlayerWhere(
    filter: PlayersFilter,
  ): Promise<Prisma.PlayerWhereInput> {
    const { birthdateMin, birthdateMax } = ageRangeToBirthdateRange(
      filter.ageMin,
      filter.ageMax,
    );
    const matchedIds = filter.skillRatingRanges
      ? await this.findLatestRatingPlayerIds(filter.skillRatingRanges)
      : null;

    return {
      ...(filter.name
        ? { nameSearch: { contains: normalizeSearchTerm(filter.name) } }
        : {}),
      ...(filter.nationalityIds?.length
        ? { nationalityId: { in: filter.nationalityIds } }
        : {}),
      ...(filter.positions?.length
        ? { positions: { some: { position: { in: filter.positions } } } }
        : {}),
      ...(filter.preferredFoot ? { preferredFoot: filter.preferredFoot } : {}),
      ...(filter.overallMin !== undefined || filter.overallMax !== undefined
        ? {
            latestOverallRating: {
              gte: filter.overallMin,
              lte: filter.overallMax,
            },
          }
        : {}),
      ...(birthdateMin || birthdateMax
        ? { birthdate: { gt: birthdateMin, lte: birthdateMax } }
        : {}),
      ...(matchedIds !== null ? { id: { in: matchedIds } } : {}),
    };
  }

  // PlayerRating é um histórico (uma linha nova só quando algum atributo
  // muda — ver comentário no schema), então filtrar um range direto nele
  // com "some" bateria em qualquer captura antiga, não necessariamente no
  // valor atual do jogador. Isola a captura mais recente por jogador numa
  // subquery (DISTINCT ON) antes de aplicar o range. Os nomes de coluna
  // interpolados vêm só de SKILL_RATING_FIELDS (nunca de input do usuário),
  // então a interpolação via Prisma.raw aqui é segura.
  private async findLatestRatingPlayerIds(
    ranges: SkillRatingRanges,
  ): Promise<string[]> {
    const conditions = Object.entries(ranges).flatMap(([field, range]) => {
      const column = Prisma.raw(`"${field}"`);
      const parts: Prisma.Sql[] = [];

      if (range?.min !== undefined) {
        parts.push(Prisma.sql`${column} >= ${range.min}`);
      }
      if (range?.max !== undefined) {
        parts.push(Prisma.sql`${column} <= ${range.max}`);
      }

      return parts;
    });

    if (conditions.length === 0) {
      return [];
    }

    const rows = await this.txHost.tx.$queryRaw<{ playerId: string }[]>(
      Prisma.sql`
        SELECT lr."playerId" AS "playerId"
        FROM (
          SELECT DISTINCT ON ("playerId") *
          FROM "PlayerRating"
          ORDER BY "playerId", "capturedAt" DESC
        ) lr
        WHERE ${Prisma.join(conditions, ' AND ')}
      `,
    );

    return rows.map((row) => row.playerId);
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
