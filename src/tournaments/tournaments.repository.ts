import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  CoinTransaction,
  PhaseType,
  Prisma,
  PrismaClient,
  Tournament,
  TournamentFormat,
} from '../../generated/prisma/client';
import {
  GoalLeaderRow,
  GroupPhaseMatch,
  MatchWithTeams,
  PhaseSummary,
  PlayerSummary,
  TeamOwner,
  TeamSummary,
  TournamentPrizeType,
} from './types';
import {
  aggregateGoalLeaderRows,
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
    groupStageConfig?: Prisma.InputJsonValue;
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

  finish(id: string): Promise<Tournament> {
    return this.txHost.tx.tournament.update({
      where: { id },
      data: { finishedAt: new Date() },
    });
  }

  findBySeason(seasonId: string): Promise<Tournament[]> {
    return this.txHost.tx.tournament.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByTeamAndSeason(seasonId: string, teamId: string): Promise<Tournament[]> {
    return this.txHost.tx.tournament.findMany({
      where: { seasonId, teams: { some: { teamId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTournamentsByTeam(
    teamId: string,
    seasonId?: string,
  ): Promise<
    {
      tournamentId: string;
      tournamentName: string;
      format: TournamentFormat;
      seasonId: string;
      seasonName: string;
    }[]
  > {
    const tournaments = await this.txHost.tx.tournament.findMany({
      where: {
        teams: { some: { teamId } },
        ...(seasonId ? { seasonId } : {}),
      },
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
      // null = bye (ver buildGroupStageQualifiersBracket).
      awayTeamId: string | null;
      groupLabel?: string;
      round?: number;
      // Preenchido só pra bye: nasce já "jogado", vencedor automático.
      playedAt?: Date;
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
      data: data.matches.map((match, index) => ({
        phaseId: phase.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        groupLabel: match.groupLabel ?? null,
        round: match.round ?? null,
        bracketSlot: index,
        playedAt: match.playedAt ?? null,
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
      // Fase GROUP nunca tem bye (só a 1ª rodada de mata-mata tem, ver
      // buildGroupStageQualifiersBracket) — sempre não-nulo aqui.
      awayTeamId: match.awayTeamId as string,
      groupLabel: match.groupLabel as string,
      playedAt: match.playedAt,
      goalScorerTeamIds: match.goals.map((goal) => goal.teamId),
    }));
  }

  async findMatchesByPhase(
    phaseId: string,
    teamIds?: string[],
  ): Promise<MatchWithTeams[]> {
    const matches = await this.txHost.tx.match.findMany({
      where: {
        phaseId,
        ...(teamIds !== undefined
          ? {
              OR: [
                { homeTeamId: { in: teamIds } },
                { awayTeamId: { in: teamIds } },
              ],
            }
          : {}),
      },
      orderBy: [{ bracketSlot: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: MATCH_SELECT_FOR_LIST,
    });

    return matches.map(toMatchWithTeams);
  }

  // Todo teamId com Squad nessa temporada, pro filtro onlyOwnedTeams (ver
  // GetSituationSchema) — sem Squad = time só de CPU (ver comentário de
  // TournamentTeam no schema).
  async findOwnedTeamIds(seasonId: string): Promise<string[]> {
    const squads = await this.txHost.tx.squad.findMany({
      where: { seasonId },
      select: { teamId: true },
    });

    return squads.map((squad) => squad.teamId);
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

  // teamId vem do snapshot Goal.teamId (time no momento do gol), não de
  // Player.teamId — por isso o groupBy é por scorerId+teamId: um jogador
  // trocado de time no meio do torneio tem os gols de cada time separados,
  // e aggregateGoalLeaderRows soma o total e escolhe o time com mais gols.
  async findTopScorers(
    tournamentId: string,
    limit: number,
  ): Promise<GoalLeaderRow[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['scorerId', 'teamId'],
      where: { match: { phase: { tournamentId } } },
      _count: { scorerId: true },
      orderBy: { _count: { scorerId: 'desc' } },
    });

    return aggregateGoalLeaderRows(
      result.map((row) => ({
        playerId: row.scorerId,
        teamId: row.teamId,
        count: row._count.scorerId,
      })),
      limit,
    );
  }

  async findTopAssists(
    tournamentId: string,
    limit: number,
  ): Promise<GoalLeaderRow[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['assistId', 'teamId'],
      where: {
        match: { phase: { tournamentId } },
        assistId: { not: null },
      },
      _count: { assistId: true },
      orderBy: { _count: { assistId: 'desc' } },
    });

    return aggregateGoalLeaderRows(
      result.map((row) => ({
        playerId: row.assistId as string,
        teamId: row.teamId,
        count: row._count.assistId,
      })),
      limit,
    );
  }

  // Hall da fama: soma gols de todos os torneios já encerrados daquele
  // formato, dentro da temporada selecionada (ver GetHallOfFameUseCase) —
  // mesmo princípio de agregação por scorerId+teamId de findTopScorers.
  // excludeTournamentId tira um torneio da conta — usado pra recalcular o
  // ranking "antes do último torneio encerrado" e descobrir se alguém
  // subiu ou desceu (ver countPositionChanges).
  async findTopScorersByFormat(
    seasonId: string,
    format: TournamentFormat,
    limit: number,
    excludeTournamentId?: string,
  ): Promise<GoalLeaderRow[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['scorerId', 'teamId'],
      where: {
        match: {
          phase: {
            tournament: {
              seasonId,
              format,
              finishedAt: { not: null },
              ...(excludeTournamentId
                ? { id: { not: excludeTournamentId } }
                : {}),
            },
          },
        },
      },
      _count: { scorerId: true },
      orderBy: { _count: { scorerId: 'desc' } },
    });

    return aggregateGoalLeaderRows(
      result.map((row) => ({
        playerId: row.scorerId,
        teamId: row.teamId,
        count: row._count.scorerId,
      })),
      limit,
    );
  }

  async findTopAssistsByFormat(
    seasonId: string,
    format: TournamentFormat,
    limit: number,
    excludeTournamentId?: string,
  ): Promise<GoalLeaderRow[]> {
    const result = await this.txHost.tx.goal.groupBy({
      by: ['assistId', 'teamId'],
      where: {
        match: {
          phase: {
            tournament: {
              seasonId,
              format,
              finishedAt: { not: null },
              ...(excludeTournamentId
                ? { id: { not: excludeTournamentId } }
                : {}),
            },
          },
        },
        assistId: { not: null },
      },
      _count: { assistId: true },
      orderBy: { _count: { assistId: 'desc' } },
    });

    return aggregateGoalLeaderRows(
      result.map((row) => ({
        playerId: row.assistId as string,
        teamId: row.teamId,
        count: row._count.assistId,
      })),
      limit,
    );
  }

  // Torneio mais recente a ser encerrado daquele formato, na temporada —
  // usado só pra saber qual torneio tirar da conta no ranking "anterior"
  // (ver findTopScorersByFormat/findTopAssistsByFormat excludeTournamentId).
  async findLatestFinishedTournamentIdByFormat(
    seasonId: string,
    format: TournamentFormat,
  ): Promise<string | null> {
    const tournament = await this.txHost.tx.tournament.findFirst({
      where: { seasonId, format, finishedAt: { not: null } },
      orderBy: { finishedAt: 'desc' },
      select: { id: true },
    });

    return tournament?.id ?? null;
  }

  // Partidas já jogadas de todos os torneios encerrados daquele formato, na
  // temporada — usado só pra contar quantos jogos cada time disputou (ver
  // countMatchesPerTeam), já que não existe registro de presença do
  // jogador em cada partida, só de quem marcou/assistiu.
  // awayTeamId: { not: null } exclui partidas de bye — não contam como
  // "partida jogada" pra nenhum dos dois times (ver
  // buildGroupStageQualifiersBracket).
  findPlayedMatchTeamsByFormat(
    seasonId: string,
    format: TournamentFormat,
  ): Promise<{ homeTeamId: string; awayTeamId: string }[]> {
    return this.txHost.tx.match.findMany({
      where: {
        playedAt: { not: null },
        awayTeamId: { not: null },
        phase: { tournament: { seasonId, format, finishedAt: { not: null } } },
      },
      select: { homeTeamId: true, awayTeamId: true },
    }) as Promise<{ homeTeamId: string; awayTeamId: string }[]>;
  }

  // Torneios já encerrados daquele formato, na temporada — usado só pra
  // descobrir o campeão de cada um (ver GetChampionTeamIdUseCase) e contar
  // títulos por time no hall da fama.
  async findFinishedTournamentIdsByFormat(
    seasonId: string,
    format: TournamentFormat,
  ): Promise<string[]> {
    const tournaments = await this.txHost.tx.tournament.findMany({
      where: { seasonId, format, finishedAt: { not: null } },
      select: { id: true },
    });

    return tournaments.map((tournament) => tournament.id);
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

  // teamId sem squad = time de CPU (ver comentário de TournamentTeam no
  // schema) — some do mapa, não tem ledger pra premiar.
  async findSquadIdsByTeamIds(
    teamIds: string[],
    seasonId: string,
  ): Promise<Map<string, string>> {
    const squads = await this.txHost.tx.squad.findMany({
      where: { seasonId, teamId: { in: teamIds } },
      select: { id: true, teamId: true },
    });

    return new Map(squads.map((squad) => [squad.teamId, squad.id]));
  }

  // Soma o que já foi lançado pra esse squad, desse tipo de prêmio,
  // ligado a essa partida/fase — usado por AwardTournamentPrizeUseCase pra
  // decidir se falta lançar algo (ver resolvePrizeDelta).
  async getRecordedPrizeTotal(params: {
    squadId: string;
    type: TournamentPrizeType;
    matchId?: string;
    phaseId?: string;
  }): Promise<number> {
    const result = await this.txHost.tx.coinTransaction.aggregate({
      where: {
        squadId: params.squadId,
        type: params.type,
        matchId: params.matchId,
        phaseId: params.phaseId,
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  createPrizeTransaction(params: {
    squadId: string;
    type: TournamentPrizeType;
    amount: number;
    matchId?: string;
    phaseId?: string;
  }): Promise<CoinTransaction> {
    return this.txHost.tx.coinTransaction.create({
      data: {
        squadId: params.squadId,
        type: params.type,
        amount: params.amount,
        matchId: params.matchId,
        phaseId: params.phaseId,
      },
    });
  }
}
