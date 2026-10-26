import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  PaginatedResult,
  PaginationQuery,
  SortOrder,
} from '../commons/pagination';

// Mapeia o campo de ordenação exposto na API pra coluna/alias real da query
// raw abaixo. Vem só de um lookup fixo (nunca interpolado direto da query
// string), então é seguro passar pra Prisma.raw().
const TEAM_SORT_COLUMN = {
  name: 't.name',
  overallRating: '"averageOverallRating"',
  defenseRating: '"averageDefenseRating"',
  midfieldRating: '"averageMidfieldRating"',
  attackRating: '"averageAttackRating"',
} as const;

export type TeamSortField = keyof typeof TEAM_SORT_COLUMN;

export interface TeamsSort {
  sortBy: TeamSortField;
  sortOrder: SortOrder;
}

export interface TeamWithRatings {
  id: string;
  name: string;
  crestUrl: string;
  league: { id: string; name: string };
  averageOverallRating: number | null;
  averageDefenseRating: number | null;
  averageMidfieldRating: number | null;
  averageAttackRating: number | null;
}

interface TeamRow {
  id: string;
  name: string;
  crestUrl: string;
  leagueId: string;
  leagueName: string;
  averageOverallRating: number | null;
  averageDefenseRating: number | null;
  averageMidfieldRating: number | null;
  averageAttackRating: number | null;
}

// Classificação por posição primária (GOL fica fora das três faixas: não é
// defesa, meio ou ataque).
const DEFENSE_POSITIONS = Prisma.sql`('ZAG', 'LD', 'LE')`;
const MIDFIELD_POSITIONS = Prisma.sql`('VOL', 'MC', 'MD', 'ME', 'MEI')`;
const ATTACK_POSITIONS = Prisma.sql`('PD', 'PE', 'ATA')`;

@Injectable()
export class TeamsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findPaginated(
    filter: { name?: string },
    sort: TeamsSort,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<TeamWithRatings>> {
    const total = await this.txHost.tx.team.count({
      where: filter.name
        ? { name: { contains: filter.name, mode: 'insensitive' } }
        : {},
    });

    const nameFilter = filter.name
      ? Prisma.sql`AND t.name ILIKE ${`%${filter.name}%`}`
      : Prisma.empty;
    const skip = (pagination.page - 1) * pagination.pageSize;
    const orderColumn = Prisma.raw(TEAM_SORT_COLUMN[sort.sortBy]);
    const orderDirection = Prisma.raw(sort.sortOrder);

    // Ordenar/paginar por médias calculadas a partir de Player/PlayerPosition
    // não dá pra expressar com findMany+orderBy do Prisma (exigiria agregar
    // antes de paginar), por isso essa query usa SQL raw com joins + CASE.
    const rows = await this.txHost.tx.$queryRaw<TeamRow[]>`
      SELECT
        t.id,
        t.name,
        t."crestUrl",
        l.id AS "leagueId",
        l.name AS "leagueName",
        ROUND(AVG(p."latestOverallRating")::numeric, 1)::float AS "averageOverallRating",
        ROUND(AVG(CASE WHEN pp.position IN ${DEFENSE_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageDefenseRating",
        ROUND(AVG(CASE WHEN pp.position IN ${MIDFIELD_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageMidfieldRating",
        ROUND(AVG(CASE WHEN pp.position IN ${ATTACK_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageAttackRating"
      FROM "Team" t
      JOIN "League" l ON l.id = t."leagueId"
      LEFT JOIN "Player" p ON p."teamId" = t.id
      LEFT JOIN "PlayerPosition" pp ON pp."playerId" = p.id AND pp."isPrimary" = true
      WHERE true ${nameFilter}
      GROUP BY t.id, t.name, t."crestUrl", l.id, l.name
      ORDER BY ${orderColumn} ${orderDirection} NULLS LAST, t.name ASC
      LIMIT ${pagination.pageSize} OFFSET ${skip}
    `;

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        crestUrl: row.crestUrl,
        league: { id: row.leagueId, name: row.leagueName },
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
}
