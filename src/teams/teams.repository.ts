import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  SortOrder,
} from '../commons/pagination';

const TEAM_ORDER_BY_FIELD = {
  name: 'name',
} as const;

export interface TeamsSort {
  sortBy: keyof typeof TEAM_ORDER_BY_FIELD;
  sortOrder: SortOrder;
}

export interface TeamWithLeague {
  id: string;
  name: string;
  crestUrl: string;
  league: { id: string; name: string };
  averageOverallRating: number | null;
}

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
  ): Promise<PaginatedResult<TeamWithLeague>> {
    const where = filter.name
      ? { name: { contains: filter.name, mode: 'insensitive' as const } }
      : {};
    const orderBy = { [TEAM_ORDER_BY_FIELD[sort.sortBy]]: sort.sortOrder };

    const result = await paginate(
      () => this.txHost.tx.team.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.team.findMany({
          where,
          skip,
          take,
          orderBy,
          include: { league: true },
        }),
      pagination,
    );

    const averageByTeamId = await this.averageOverallByTeamId(
      result.data.map((team) => team.id),
    );

    return {
      ...result,
      data: result.data.map((team) => ({
        id: team.id,
        name: team.name,
        crestUrl: team.crestUrl,
        league: { id: team.league.id, name: team.league.name },
        averageOverallRating: averageByTeamId.get(team.id) ?? null,
      })),
    };
  }

  private async averageOverallByTeamId(
    teamIds: string[],
  ): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map();

    const averages = await this.txHost.tx.player.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds } },
      _avg: { latestOverallRating: true },
    });

    return new Map(
      averages.map((row) => [
        row.teamId,
        Math.round((row._avg.latestOverallRating ?? 0) * 10) / 10,
      ]),
    );
  }
}
