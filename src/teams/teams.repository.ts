import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  Formation,
  Prisma,
  PrismaClient,
  Team,
} from '../../generated/prisma/client';
import { PaginatedResult, PaginationQuery } from '../commons/pagination';
import {
  LineupSlotInput,
  TeamCrestDimension,
  TeamRow,
  TeamSortField,
  TeamsSort,
  TeamWithRatings,
  UpdateTeamData,
} from './types';
import { TeamMatchResult } from './utils';

const TEAM_SORT_COLUMN: Record<TeamSortField, string> = {
  name: 't.name',
  averageOverallRating: '"averageOverallRating"',
  averageDefenseRating: '"averageDefenseRating"',
  averageMidfieldRating: '"averageMidfieldRating"',
  averageAttackRating: '"averageAttackRating"',
};

const DEFENSE_POSITIONS = Prisma.sql`('ZAG', 'LD', 'LE')`;
const MIDFIELD_POSITIONS = Prisma.sql`('VOL', 'MC', 'MD', 'ME', 'MEI')`;
const ATTACK_POSITIONS = Prisma.sql`('PD', 'PE', 'ATA')`;

const ONLY_STARTERS_OR_WHOLE_SQUAD = Prisma.sql`(
  NOT EXISTS (SELECT 1 FROM "TeamLineupSlot" ls WHERE ls."teamId" = t.id)
  OR EXISTS (
    SELECT 1 FROM "TeamLineupSlot" ls
    WHERE ls."teamId" = t.id AND ls."playerId" = p.id
  )
)`;

@Injectable()
export class TeamsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findPaginated(
    filter: { name?: string; leagueId?: string; withoutFormation?: boolean },
    sort: TeamsSort,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<TeamWithRatings>> {
    const total = await this.txHost.tx.team.count({
      where: {
        ...(filter.name
          ? { name: { contains: filter.name, mode: 'insensitive' } }
          : {}),
        ...(filter.leagueId ? { leagueId: filter.leagueId } : {}),
        ...(filter.withoutFormation ? { formation: null } : {}),
      },
    });

    const nameFilter = filter.name
      ? Prisma.sql`AND t.name ILIKE ${`%${filter.name}%`}`
      : Prisma.empty;
    const leagueFilter = filter.leagueId
      ? Prisma.sql`AND l.id = ${filter.leagueId}::uuid`
      : Prisma.empty;
    const withoutFormationFilter = filter.withoutFormation
      ? Prisma.sql`AND t.formation IS NULL`
      : Prisma.empty;
    const skip = (pagination.page - 1) * pagination.pageSize;
    const orderColumn = Prisma.raw(TEAM_SORT_COLUMN[sort.sortBy]);
    const orderDirection = Prisma.raw(sort.sortOrder);

    const rows = await this.txHost.tx.$queryRaw<TeamRow[]>`
      SELECT
        t.id,
        t.name,
        t."crestUrl",
        t.formation,
        l.id AS "leagueId",
        l.name AS "leagueName",
        ROUND(AVG(p."latestOverallRating")::numeric, 1)::float AS "averageOverallRating",
        ROUND(AVG(CASE WHEN pp.position IN ${DEFENSE_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageDefenseRating",
        ROUND(AVG(CASE WHEN pp.position IN ${MIDFIELD_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageMidfieldRating",
        ROUND(AVG(CASE WHEN pp.position IN ${ATTACK_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageAttackRating"
      FROM "Team" t
      JOIN "League" l ON l.id = t."leagueId"
      LEFT JOIN "Player" p ON p."teamId" = t.id AND ${ONLY_STARTERS_OR_WHOLE_SQUAD}
      LEFT JOIN "PlayerPosition" pp ON pp."playerId" = p.id AND pp."isPrimary" = true
      WHERE true ${nameFilter} ${leagueFilter} ${withoutFormationFilter}
      GROUP BY t.id, t.name, t."crestUrl", t.formation, l.id, l.name
      ORDER BY ${orderColumn} ${orderDirection} NULLS LAST, t.name ASC
      LIMIT ${pagination.pageSize} OFFSET ${skip}
    `;

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        crestUrl: row.crestUrl,
        formation: row.formation,
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

  async findById(id: string): Promise<TeamWithRatings | null> {
    const rows = await this.txHost.tx.$queryRaw<TeamRow[]>`
      SELECT
        t.id,
        t.name,
        t."crestUrl",
        t.formation,
        l.id AS "leagueId",
        l.name AS "leagueName",
        ROUND(AVG(p."latestOverallRating")::numeric, 1)::float AS "averageOverallRating",
        ROUND(AVG(CASE WHEN pp.position IN ${DEFENSE_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageDefenseRating",
        ROUND(AVG(CASE WHEN pp.position IN ${MIDFIELD_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageMidfieldRating",
        ROUND(AVG(CASE WHEN pp.position IN ${ATTACK_POSITIONS} THEN p."latestOverallRating" END)::numeric, 1)::float AS "averageAttackRating"
      FROM "Team" t
      JOIN "League" l ON l.id = t."leagueId"
      LEFT JOIN "Player" p ON p."teamId" = t.id AND ${ONLY_STARTERS_OR_WHOLE_SQUAD}
      LEFT JOIN "PlayerPosition" pp ON pp."playerId" = p.id AND pp."isPrimary" = true
      WHERE t.id = ${id}::uuid
      GROUP BY t.id, t.name, t."crestUrl", t.formation, l.id, l.name
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
      league: { id: row.leagueId, name: row.leagueName },
      averageOverallRating: row.averageOverallRating,
      averageDefenseRating: row.averageDefenseRating,
      averageMidfieldRating: row.averageMidfieldRating,
      averageAttackRating: row.averageAttackRating,
    };
  }

  async update(id: string, data: UpdateTeamData): Promise<void> {
    await this.txHost.tx.team.update({ where: { id }, data });
  }

  upsertByNameAndLeague(data: {
    name: string;
    leagueId: string;
    crestUrl: string;
  }): Promise<Team> {
    return this.txHost.tx.team.upsert({
      where: { name_leagueId: { name: data.name, leagueId: data.leagueId } },
      create: data,
      update: { crestUrl: data.crestUrl, leagueId: data.leagueId },
    });
  }

  async replaceLineup(
    teamId: string,
    formation: Formation,
    slots: LineupSlotInput[],
  ): Promise<void> {
    await this.txHost.tx.$transaction([
      this.txHost.tx.team.update({
        where: { id: teamId },
        data: { formation },
      }),
      this.txHost.tx.teamLineupSlot.deleteMany({ where: { teamId } }),
      this.txHost.tx.teamLineupSlot.createMany({
        data: slots.map((slot) => ({ teamId, ...slot })),
      }),
    ]);
  }

  async findIdsByNames(names: string[]): Promise<Map<string, string[]>> {
    const teams = await this.txHost.tx.team.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true },
    });

    const idsByName = new Map<string, string[]>();
    for (const team of teams) {
      const ids = idsByName.get(team.name) ?? [];
      ids.push(team.id);
      idsByName.set(team.name, ids);
    }

    return idsByName;
  }

  async findCrestDimensionsByNames(
    names: string[],
  ): Promise<Map<string, TeamCrestDimension[]>> {
    const teams = await this.txHost.tx.team.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true, league: { select: { name: true } } },
    });

    const dimensionsByName = new Map<string, TeamCrestDimension[]>();
    for (const team of teams) {
      const dimensions = dimensionsByName.get(team.name) ?? [];
      dimensions.push({ id: team.id, leagueName: team.league.name });
      dimensionsByName.set(team.name, dimensions);
    }

    return dimensionsByName;
  }

  async findIdsByAliases(aliases: string[]): Promise<Map<string, string>> {
    const teamAliases = await this.txHost.tx.teamAlias.findMany({
      where: { alias: { in: aliases } },
      select: { alias: true, teamId: true },
    });

    return new Map(
      teamAliases.map((teamAlias) => [teamAlias.alias, teamAlias.teamId]),
    );
  }

  async upsertAlias(alias: string, teamId: string): Promise<void> {
    await this.txHost.tx.teamAlias.upsert({
      where: { alias },
      create: { alias, teamId },
      update: { teamId },
    });
  }

  // Todo jogo já disputado pelo time (real, qualquer temporada/torneio),
  // do ponto de vista dele — já resolve quem foi o adversário e goals
  // pró/contra em vez de homeGoals/awayGoals. Ordenado do mais recente pro
  // mais antigo pra alimentar tanto "últimos 10 jogos" quanto a campanha da
  // temporada (ver computeSeasonCampaign/toRecentMatches/computeHeadToHead
  // em utils/team-campaign.utils.ts).
  async findPlayedMatchesForTeam(teamId: string): Promise<TeamMatchResult[]> {
    const matches = await this.txHost.tx.match.findMany({
      where: {
        playedAt: { not: null },
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: { playedAt: 'desc' },
      select: {
        id: true,
        playedAt: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { id: true, name: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, crestUrl: true } },
        goals: { select: { teamId: true } },
        phase: { select: { tournament: { select: { seasonId: true } } } },
      },
    });

    return matches.map((match) => {
      const isHome = match.homeTeamId === teamId;
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      const opponentTeamId = isHome ? match.awayTeamId : match.homeTeamId;

      let goalsFor = 0;
      let goalsAgainst = 0;
      for (const goal of match.goals) {
        if (goal.teamId === teamId) {
          goalsFor++;
        } else if (goal.teamId === opponentTeamId) {
          goalsAgainst++;
        }
      }

      return {
        matchId: match.id,
        playedAt: match.playedAt as Date,
        seasonId: match.phase.tournament.seasonId,
        opponent,
        goalsFor,
        goalsAgainst,
      };
    });
  }

  async findTopScorersForTeam(
    teamId: string,
    limit: number,
  ): Promise<{ playerId: string; count: number }[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['scorerId'],
      where: { teamId },
      _count: { scorerId: true },
      orderBy: { _count: { scorerId: 'desc' } },
      take: limit,
    });

    return result.map((row) => ({
      playerId: row.scorerId,
      count: row._count.scorerId,
    }));
  }

  async findTopAssistsForTeam(
    teamId: string,
    limit: number,
  ): Promise<{ playerId: string; count: number }[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['assistId'],
      where: {
        teamId,
        assistId: { not: null },
      },
      _count: { assistId: true },
      orderBy: { _count: { assistId: 'desc' } },
      take: limit,
    });

    return result.map((row) => ({
      playerId: row.assistId as string,
      count: row._count.assistId,
    }));
  }
}
