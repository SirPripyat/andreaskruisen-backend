import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient } from '../../generated/prisma/client';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
} from '../commons/pagination';
import {
  MatchPenalties,
  MatchWithTeams,
  PlayerSummary,
} from '../tournaments/types';
import {
  MATCH_SELECT_FOR_LIST,
  PLAYER_SELECT_FOR_SUMMARY,
  PLAYER_SUMMARY_SELECT,
  toMatchWithTeams,
  toPenalties,
  toPlayerSummary,
} from '../tournaments/utils';
import { MatchDetail, MatchForGoals, SimulationRosterPlayer } from './types';

@Injectable()
export class MatchesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  async findPaginatedMatches(
    phaseId: string,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<MatchWithTeams>> {
    const result = await paginate(
      () => this.txHost.tx.match.count({ where: { phaseId } }),
      ({ skip, take }) =>
        this.txHost.tx.match.findMany({
          where: { phaseId },
          skip,
          take,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: MATCH_SELECT_FOR_LIST,
        }),
      pagination,
    );

    return { ...result, data: result.data.map(toMatchWithTeams) };
  }

  async findMatchForGoals(matchId: string): Promise<MatchForGoals | null> {
    const match = await this.txHost.tx.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        phaseId: true,
        homeTeamId: true,
        awayTeamId: true,
        playedAt: true,
        phase: {
          select: {
            tournamentId: true,
            order: true,
            type: true,
            tournament: { select: { seasonId: true } },
          },
        },
      },
    });

    return match
      ? {
          id: match.id,
          tournamentId: match.phase.tournamentId,
          seasonId: match.phase.tournament.seasonId,
          phaseId: match.phaseId,
          phaseOrder: match.phase.order,
          phaseType: match.phase.type,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          playedAt: match.playedAt,
        }
      : null;
  }

  async findMatchDetail(matchId: string): Promise<MatchDetail | null> {
    const match = await this.txHost.tx.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        groupLabel: true,
        round: true,
        playedAt: true,
        penaltyHomeScore: true,
        penaltyAwayScore: true,
        penaltyWinnerTeamId: true,
        phase: {
          select: {
            tournamentId: true,
            order: true,
            type: true,
            tournament: { select: { seasonId: true } },
          },
        },
        homeTeam: { select: { id: true, name: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, crestUrl: true } },
        goals: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            scorer: { select: PLAYER_SUMMARY_SELECT },
            assist: { select: PLAYER_SUMMARY_SELECT },
          },
        },
      },
    });

    if (!match) {
      return null;
    }

    return {
      id: match.id,
      tournamentId: match.phase.tournamentId,
      seasonId: match.phase.tournament.seasonId,
      phaseOrder: match.phase.order,
      phaseType: match.phase.type,
      groupLabel: match.groupLabel,
      round: match.round,
      playedAt: match.playedAt,
      penalties: toPenalties(match),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      goals: match.goals.map((goal) => ({
        id: goal.id,
        scorer: toPlayerSummary(goal.scorer),
        assist: goal.assist ? toPlayerSummary(goal.assist) : null,
      })),
    };
  }

  async findPlayersByTeamIds(
    seasonId: string,
    teamIds: string[],
  ): Promise<PlayerSummary[]> {
    const assignments = await this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, teamId: { in: teamIds } },
      orderBy: { player: { name: 'asc' } },
      select: { teamId: true, player: { select: PLAYER_SELECT_FOR_SUMMARY } },
    });
    return assignments.map(({ teamId, player }) =>
      toPlayerSummary({ ...player, teamId }),
    );
  }

  findAssignedTeamsByPlayerIds(
    seasonId: string,
    playerIds: string[],
  ): Promise<{ playerId: string; teamId: string }[]> {
    return this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, playerId: { in: playerIds } },
      select: { playerId: true, teamId: true },
    });
  }

  // Sem cobrador de pênalti fixo no elenco: quem bate é escolhido na hora
  // da simulação (ver pickWeightedPlayer), então pegamos o atributo
  // "penalties" (0-99, mesma escala do overall) mais recente de cada
  // jogador pra calcular a chance de conversão de quem for sorteado.
  async findPlayersForSimulation(
    seasonId: string,
    teamIds: string[],
  ): Promise<SimulationRosterPlayer[]> {
    const assignments = await this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, teamId: { in: teamIds } },
      select: {
        teamId: true,
        isStarter: true,
        player: {
          select: {
            id: true,
            latestOverallRating: true,
            positions: { select: { position: true, isPrimary: true } },
            ratings: {
              orderBy: { capturedAt: 'desc' },
              take: 1,
              select: { penalties: true },
            },
          },
        },
      },
    });

    const teamsWithStarters = new Set(
      assignments.filter((a) => a.isStarter).map((a) => a.teamId),
    );

    return assignments
      .filter((a) => !teamsWithStarters.has(a.teamId) || a.isStarter)
      .map((a) => {
        const primary =
          a.player.positions.find((position) => position.isPrimary) ??
          a.player.positions[0];

        return {
          id: a.player.id,
          teamId: a.teamId,
          overallRating: a.player.latestOverallRating,
          // Fallback só pra jogador sem nenhum PlayerRating capturado ainda
          // (não deveria acontecer, já que latestOverallRating vem de lá).
          penaltyRating: a.player.ratings[0]?.penalties ?? 50,
          position: primary?.position ?? 'ATA',
        };
      });
  }

  async replaceMatchGoals(
    matchId: string,
    goals: { scorerId: string; assistId: string | null; teamId: string }[],
    penalties: MatchPenalties | null,
  ): Promise<void> {
    await this.txHost.tx.goal.deleteMany({ where: { matchId } });
    if (goals.length > 0) {
      await this.txHost.tx.goal.createMany({
        data: goals.map((goal) => ({
          matchId,
          scorerId: goal.scorerId,
          assistId: goal.assistId,
          teamId: goal.teamId,
        })),
      });
    }
    await this.txHost.tx.match.update({
      where: { id: matchId },
      data: {
        playedAt: new Date(),
        penaltyHomeScore: penalties?.homeScore ?? null,
        penaltyAwayScore: penalties?.awayScore ?? null,
        penaltyWinnerTeamId: penalties?.winnerTeamId ?? null,
      },
    });
  }
}
