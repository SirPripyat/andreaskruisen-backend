import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { normalizeSearchTerm } from '../commons/normalize-search-term';
import { PaginatedResult, PaginationQuery } from '../commons/pagination';
import { ClubRow, ClubSortField, ClubsSort, ClubWithRatings } from './types';

const CLUB_SORT_COLUMN: Record<ClubSortField, string> = {
  name: 't.name',
  averageOverallRating: '"averageOverallRating"',
  averageDefenseRating: '"averageDefenseRating"',
  averageMidfieldRating: '"averageMidfieldRating"',
  averageAttackRating: '"averageAttackRating"',
};

const DEFENSE_POSITIONS = Prisma.sql`('ZAG', 'LD', 'LE')`;
const MIDFIELD_POSITIONS = Prisma.sql`('VOL', 'MC', 'MD', 'ME', 'MEI')`;
const ATTACK_POSITIONS = Prisma.sql`('PD', 'PE', 'ATA')`;

// buildOnlyStartersOrWholeSquad é o equivalente season-aware do
// ONLY_STARTERS_OR_WHOLE_SQUAD de teams.repository: olha pro elenco DESSA
// temporada (PlayerTeamAssignment), não pro elenco real do time
// (Player.teamId). Precisa ser montado por chamada (não uma constante de
// módulo) porque interpola o seasonId do parâmetro.
const buildOnlyStartersOrWholeSquad = (seasonId: string) => Prisma.sql`(
  NOT EXISTS (
    SELECT 1 FROM "PlayerTeamAssignment" ptaStarters
    WHERE ptaStarters."teamId" = t.id
      AND ptaStarters."seasonId" = ${seasonId}::uuid
      AND ptaStarters."isStarter" = true
  )
  OR pta."isStarter" = true
)`;

@Injectable()
export class ClubsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findPaginated(
    filter: { name?: string; leagueId?: string },
    sort: ClubsSort,
    pagination: PaginationQuery,
    seasonId: string,
  ): Promise<PaginatedResult<ClubWithRatings>> {
    const total = await this.txHost.tx.team.count({
      where: {
        ...(filter.name
          ? { nameSearch: { contains: normalizeSearchTerm(filter.name) } }
          : {}),
        ...(filter.leagueId ? { leagueId: filter.leagueId } : {}),
      },
    });

    const nameFilter = filter.name
      ? Prisma.sql`AND t."nameSearch" ILIKE ${`%${normalizeSearchTerm(filter.name)}%`}`
      : Prisma.empty;

    const leagueFilter = filter.leagueId
      ? Prisma.sql`AND l.id = ${filter.leagueId}::uuid`
      : Prisma.empty;

    const skip = (pagination.page - 1) * pagination.pageSize;
    const orderColumn = Prisma.raw(CLUB_SORT_COLUMN[sort.sortBy]);
    const orderDirection = Prisma.raw(sort.sortOrder);
    const onlyStartersOrWholeSquad = buildOnlyStartersOrWholeSquad(seasonId);

    const rows = await this.txHost.tx.$queryRaw<ClubRow[]>`
      SELECT
        t.id,
        t.name,
        t."crestUrl",
        COALESCE(sq.formation, t.formation) AS formation,
        l.id AS "leagueId",
        l.name AS "leagueName",
        l."logoUrl" AS "leagueLogo",
        ROUND(AVG(p."latestOverallRating")::numeric, 1)::float AS "averageOverallRating",
        ROUND(AVG(CASE WHEN pp.position IN ${DEFENSE_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageDefenseRating",
        ROUND(AVG(CASE WHEN pp.position IN ${MIDFIELD_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageMidfieldRating",
        ROUND(AVG(CASE WHEN pp.position IN ${ATTACK_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageAttackRating"
      FROM "Team" t
      JOIN "League" l ON l.id = t."leagueId"
      LEFT JOIN "Squad" sq ON sq."teamId" = t.id AND sq."seasonId" = ${seasonId}::uuid
      LEFT JOIN "PlayerTeamAssignment" pta ON pta."teamId" = t.id AND pta."seasonId" = ${seasonId}::uuid AND ${onlyStartersOrWholeSquad}
      LEFT JOIN "Player" p ON p.id = pta."playerId"
      LEFT JOIN "PlayerPosition" pp ON pp."playerId" = p.id AND pp."isPrimary" = true
      WHERE true ${nameFilter} ${leagueFilter}
      GROUP BY t.id, t.name, t."crestUrl", sq.formation, t.formation, l.id, l.name
      ORDER BY ${orderColumn} ${orderDirection} NULLS LAST, t.name ASC
      LIMIT ${pagination.pageSize} OFFSET ${skip}
    `;

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        crestUrl: row.crestUrl,
        formation: row.formation,
        league: {
          id: row.leagueId,
          name: row.leagueName,
          logoUrl: row.leagueLogo,
        },
        averageOverallRating: row.averageOverallRating,
        averageDefenseRating: row.averageDefenseRating,
        averageMidfieldRating: row.averageMidfieldRating,
        averageAttackRating: row.averageAttackRating,
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findById(
    id: string,
    seasonId: string,
  ): Promise<ClubWithRatings | null> {
    const onlyStartersOrWholeSquad = buildOnlyStartersOrWholeSquad(seasonId);

    const rows = await this.txHost.tx.$queryRaw<ClubRow[]>`
      SELECT
        t.id,
        t.name,
        t."crestUrl",
        COALESCE(sq.formation, t.formation) AS formation,
        l.id AS "leagueId",
        l.name AS "leagueName",
        l."logoUrl" AS "leagueLogo",
        ROUND(AVG(p."latestOverallRating")::numeric, 1)::float AS "averageOverallRating",
        ROUND(AVG(CASE WHEN pp.position IN ${DEFENSE_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageDefenseRating",
        ROUND(AVG(CASE WHEN pp.position IN ${MIDFIELD_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageMidfieldRating",
        ROUND(AVG(CASE WHEN pp.position IN ${ATTACK_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageAttackRating"
      FROM "Team" t
      JOIN "League" l ON l.id = t."leagueId"
      LEFT JOIN "Squad" sq ON sq."teamId" = t.id AND sq."seasonId" = ${seasonId}::uuid
      LEFT JOIN "PlayerTeamAssignment" pta ON pta."teamId" = t.id AND pta."seasonId" = ${seasonId}::uuid AND ${onlyStartersOrWholeSquad}
      LEFT JOIN "Player" p ON p.id = pta."playerId"
      LEFT JOIN "PlayerPosition" pp ON pp."playerId" = p.id AND pp."isPrimary" = true
      WHERE t.id = ${id}::uuid
      GROUP BY t.id, t.name, t."crestUrl", sq.formation, t.formation, l.id, l.name
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      crestUrl: row.crestUrl,
      formation: row.formation,
      league: {
        id: row.leagueId,
        name: row.leagueName,
        logoUrl: row.leagueLogo,
      },
      averageOverallRating: row.averageOverallRating,
      averageDefenseRating: row.averageDefenseRating,
      averageMidfieldRating: row.averageMidfieldRating,
      averageAttackRating: row.averageAttackRating,
    };
  }
}
