import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  PhaseType,
  Prisma,
  PrismaClient,
  Tournament,
  TournamentFormat,
} from '../../generated/prisma/client';
import {
  GroupPhaseMatch,
  MatchWithTeams,
  PhaseSummary,
  PlayerSummary,
  TeamOwner,
  TeamSummary,
} from './types';
import {
  MATCH_SELECT_FOR_LIST,
  PLAYER_SUMMARY_SELECT,
  toMatchWithTeams,
  toPlayerSummary,
} from './utils';

@Injectable()
export class TournamentsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: {
    seasonId: string;
    name: string;
    format: TournamentFormat;
    maxTeams: number;
  }): Promise<Tournament> {
    return this.txHost.tx.tournament.create({ data });
  }

  findById(id: string): Promise<Tournament | null> {
    return this.txHost.tx.tournament.findUnique({ where: { id } });
  }

  update(id: string, data: { name: string }): Promise<Tournament> {
    return this.txHost.tx.tournament.update({ where: { id }, data });
  }

  delete(id: string): Promise<Tournament> {
    return this.txHost.tx.tournament.delete({ where: { id } });
  }

  findBySeason(seasonId: string): Promise<Tournament[]> {
    return this.txHost.tx.tournament.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTournamentsByTeam(teamId: string): Promise<
    {
      tournamentId: string;
      tournamentName: string;
      format: TournamentFormat;
      seasonId: string;
      seasonName: string;
    }[]
  > {
    const tournaments = await this.txHost.tx.tournament.findMany({
      where: { teams: { some: { teamId } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        format: true,
        seasonId: true,
        season: { select: { name: true } },
      },
    });

    return tournaments.map((tournament) => ({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      format: tournament.format,
      seasonId: tournament.seasonId,
      seasonName: tournament.season.name,
    }));
  }

  createTeams(
    tournamentId: string,
    teamIds: string[],
  ): Promise<Prisma.BatchPayload> {
    return this.txHost.tx.tournamentTeam.createMany({
      data: teamIds.map((teamId) => ({ tournamentId, teamId })),
    });
  }

  removeAllTeams(tournamentId: string): Promise<{ count: number }> {
    return this.txHost.tx.tournamentTeam.deleteMany({
      where: { tournamentId },
    });
  }

  async createPhaseWithMatches(data: {
    tournamentId: string;
    type: PhaseType;
    order: number;
    name: string;
    matches: {
      homeTeamId: string;
      awayTeamId: string;
      groupLabel?: string;
      round?: number;
    }[];
  }): Promise<void> {
    const phase = await this.txHost.tx.phase.create({
      data: {
        tournamentId: data.tournamentId,
        type: data.type,
        order: data.order,
        name: data.name,
      },
    });

    await this.txHost.tx.match.createMany({
      data: data.matches.map((match) => ({
        phaseId: phase.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        groupLabel: match.groupLabel,
        round: match.round,
      })),
    });
  }

  removeAllPhases(tournamentId: string): Promise<{ count: number }> {
    return this.txHost.tx.phase.deleteMany({ where: { tournamentId } });
  }

  async removeAllMatches(tournamentId: string): Promise<{ count: number }> {
    await this.txHost.tx.goal.deleteMany({
      where: { match: { phase: { tournamentId } } },
    });
    return this.txHost.tx.match.deleteMany({
      where: { phase: { tournamentId } },
    });
  }

  findLatestPhase(tournamentId: string): Promise<PhaseSummary | null> {
    return this.txHost.tx.phase.findFirst({
      where: { tournamentId },
      orderBy: { order: 'desc' },
      select: { id: true, type: true, order: true, name: true },
    });
  }

  findPhaseByOrder(
    tournamentId: string,
    order: number,
  ): Promise<PhaseSummary | null> {
    return this.txHost.tx.phase.findUnique({
      where: { tournamentId_order: { tournamentId, order } },
      select: { id: true, type: true, order: true, name: true },
    });
  }

  findPhasesByTournament(tournamentId: string): Promise<PhaseSummary[]> {
    return this.txHost.tx.phase.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
      select: { id: true, type: true, order: true, name: true },
    });
  }

  async findGroupMatches(phaseId: string): Promise<GroupPhaseMatch[]> {
    const matches = await this.txHost.tx.match.findMany({
      where: { phaseId },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        groupLabel: true,
        playedAt: true,
        goals: { select: { teamId: true } },
      },
    });

    return matches.map((match) => ({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      groupLabel: match.groupLabel as string,
      playedAt: match.playedAt,
      goalScorerTeamIds: match.goals.map((goal) => goal.teamId),
    }));
  }

  async findMatchesByPhase(phaseId: string): Promise<MatchWithTeams[]> {
    const matches = await this.txHost.tx.match.findMany({
      where: { phaseId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: MATCH_SELECT_FOR_LIST,
    });

    return matches.map(toMatchWithTeams);
  }

  findTeamsByIds(teamIds: string[]): Promise<TeamSummary[]> {
    return this.txHost.tx.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true, crestUrl: true },
    });
  }

  async hasLaterPhase(
    tournamentId: string,
    phaseOrder: number,
  ): Promise<boolean> {
    const count = await this.txHost.tx.phase.count({
      where: { tournamentId, order: { gt: phaseOrder } },
    });
    return count > 0;
  }

  countUnplayedMatches(phaseId: string): Promise<number> {
    return this.txHost.tx.match.count({ where: { phaseId, playedAt: null } });
  }

  countMatches(phaseId: string): Promise<number> {
    return this.txHost.tx.match.count({ where: { phaseId } });
  }

  findPhaseForTournament(
    tournamentId: string,
    phaseId: string,
  ): Promise<PhaseSummary | null> {
    return this.txHost.tx.phase.findFirst({
      where: { id: phaseId, tournamentId },
      select: { id: true, type: true, order: true, name: true },
    });
  }

  async findPlayersByIds(playerIds: string[]): Promise<PlayerSummary[]> {
    const players = await this.txHost.tx.player.findMany({
      where: { id: { in: playerIds } },
      select: PLAYER_SUMMARY_SELECT,
    });
    return players.map(toPlayerSummary);
  }

  async findTopScorers(
    tournamentId: string,
    limit: number,
  ): Promise<{ playerId: string; count: number }[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['scorerId'],
      where: { match: { phase: { tournamentId } } },
      _count: { scorerId: true },
      orderBy: { _count: { scorerId: 'desc' } },
      take: limit,
    });

    return result.map((row) => ({
      playerId: row.scorerId,
      count: row._count.scorerId,
    }));
  }

  async findTopAssists(
    tournamentId: string,
    limit: number,
  ): Promise<{ playerId: string; count: number }[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['assistId'],
      where: {
        match: { phase: { tournamentId } },
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

  async findOwnersByTeamIds(
    teamIds: string[],
    seasonId: string,
  ): Promise<Map<string, TeamOwner>> {
    const squads = await this.txHost.tx.squad.findMany({
      where: { seasonId, teamId: { in: teamIds } },
      select: { teamId: true, user: { select: { id: true, name: true } } },
    });

    return new Map(squads.map((squad) => [squad.teamId, squad.user]));
  }
}
