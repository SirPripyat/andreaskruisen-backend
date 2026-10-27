import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  PhaseType,
  PositionCode,
  Prisma,
  PrismaClient,
  Tournament,
  TournamentFormat,
} from '../../generated/prisma/client';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
} from '../commons/pagination';

export interface PhaseSummary {
  id: string;
  type: PhaseType;
  order: number;
  name: string;
}

export interface GroupPhaseMatch {
  homeTeamId: string;
  awayTeamId: string;
  groupLabel: string;
  // null = partida ainda não jogada. Ver GoalsByTeam no service pra como o
  // placar é derivado dos Goal da partida.
  playedAt: Date | null;
  goalScorerTeamIds: string[];
}

export interface TeamSummary {
  id: string;
  name: string;
  crestUrl: string;
}

export interface MatchWithTeams {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  goalScorerTeamIds: string[];
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
}

export interface MatchForGoals {
  id: string;
  tournamentId: string;
  phaseId: string;
  // Order (Phase.order) da fase da partida — usado pra saber se a partida
  // está travada (ver TournamentsRepository.hasLaterPhase).
  phaseOrder: number;
  homeTeamId: string;
  awayTeamId: string;
  playedAt: Date | null;
}

export interface SimulationRosterPlayer {
  id: string;
  teamId: string;
  overallRating: number;
  position: PositionCode;
}

export interface PlayerSummary {
  id: string;
  name: string;
  photoUrl: string;
  teamId: string;
  // Posição principal (isPrimary) — usada pro front ordenar os seletores de
  // artilheiro/assistência (ataque antes de meio, defesa e goleiro).
  position: PositionCode;
}

export interface GoalWithPlayers {
  id: string;
  scorer: PlayerSummary;
  assist: PlayerSummary | null;
}

export interface MatchDetail {
  id: string;
  tournamentId: string;
  phaseOrder: number;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  goals: GoalWithPlayers[];
}

export interface TeamOwner {
  id: string;
  name: string;
}

const MATCH_SELECT_FOR_LIST = {
  id: true,
  groupLabel: true,
  round: true,
  playedAt: true,
  homeTeam: { select: { id: true, name: true, crestUrl: true } },
  awayTeam: { select: { id: true, name: true, crestUrl: true } },
  goals: { select: { scorer: { select: { teamId: true } } } },
} as const;

function toMatchWithTeams(match: {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  goals: { scorer: { teamId: string } }[];
}): MatchWithTeams {
  return {
    id: match.id,
    groupLabel: match.groupLabel,
    round: match.round,
    playedAt: match.playedAt,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    goalScorerTeamIds: match.goals.map((goal) => goal.scorer.teamId),
  };
}

const PLAYER_SUMMARY_SELECT = {
  id: true,
  name: true,
  photoUrl: true,
  teamId: true,
  positions: { select: { position: true, isPrimary: true } },
} as const;

function toPlayerSummary(player: {
  id: string;
  name: string;
  photoUrl: string;
  teamId: string;
  positions: { position: PositionCode; isPrimary: boolean }[];
}): PlayerSummary {
  const primary =
    player.positions.find((position) => position.isPrimary) ??
    player.positions[0];

  return {
    id: player.id,
    name: player.name,
    photoUrl: player.photoUrl,
    teamId: player.teamId,
    position: primary?.position ?? 'ATA',
  };
}

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

  // Apaga os Goal antes: Goal.matchId é Restrict, então excluir o torneio
  // com partidas já jogadas quebraria sem isso.
  async removeAllMatches(tournamentId: string): Promise<{ count: number }> {
    await this.txHost.tx.goal.deleteMany({
      where: { match: { phase: { tournamentId } } },
    });
    return this.txHost.tx.match.deleteMany({
      where: { phase: { tournamentId } },
    });
  }

  // "Fase atual" = a de maior order. Fases futuras só são geradas depois
  // que a anterior termina, então a de maior order é sempre a vigente.
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

  // Toda partida de uma fase GROUP tem groupLabel (ver geração em
  // match-generation.ts); o campo só é null em fases KNOCKOUT, que não usam
  // este método.
  async findGroupMatches(phaseId: string): Promise<GroupPhaseMatch[]> {
    const matches = await this.txHost.tx.match.findMany({
      where: { phaseId },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        groupLabel: true,
        playedAt: true,
        goals: { select: { scorer: { select: { teamId: true } } } },
      },
    });

    return matches.map((match) => ({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      groupLabel: match.groupLabel as string,
      playedAt: match.playedAt,
      goalScorerTeamIds: match.goals.map((goal) => goal.scorer.teamId),
    }));
  }

  // Lista completa (sem paginação) das partidas de uma fase — usado na
  // situação do torneio pros confrontos de mata-mata, que são poucos
  // (no máximo maxTeams/2). Listagem paginada fica em findPaginatedMatches.
  async findMatchesByPhase(phaseId: string): Promise<MatchWithTeams[]> {
    const matches = await this.txHost.tx.match.findMany({
      where: { phaseId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: MATCH_SELECT_FOR_LIST,
    });

    return matches.map(toMatchWithTeams);
  }

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

  findTeamsByIds(teamIds: string[]): Promise<TeamSummary[]> {
    return this.txHost.tx.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true, crestUrl: true },
    });
  }

  // Usado pra validar que a partida pertence ao torneio da rota antes de
  // registrar gols (ver TournamentsService.replaceMatchGoals e simulateMatch).
  async findMatchForGoals(matchId: string): Promise<MatchForGoals | null> {
    const match = await this.txHost.tx.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        phaseId: true,
        homeTeamId: true,
        awayTeamId: true,
        playedAt: true,
        phase: { select: { tournamentId: true, order: true } },
      },
    });

    return match
      ? {
          id: match.id,
          tournamentId: match.phase.tournamentId,
          phaseId: match.phaseId,
          phaseOrder: match.phase.order,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          playedAt: match.playedAt,
        }
      : null;
  }

  // Uma fase está travada pra edição quando já existe uma fase seguinte
  // gerada a partir dela (ver TournamentsService.advancePhase) — nesse ponto
  // o chaveamento/classificação seguinte já foi montado com base nela.
  async hasLaterPhase(
    tournamentId: string,
    phaseOrder: number,
  ): Promise<boolean> {
    const count = await this.txHost.tx.phase.count({
      where: { tournamentId, order: { gt: phaseOrder } },
    });
    return count > 0;
  }

  // Pra saber se a fase de grupos terminou (todas as partidas jogadas) e
  // pode gerar o mata-mata — ver TournamentsService.maybeAdvanceToKnockout.
  countUnplayedMatches(phaseId: string): Promise<number> {
    return this.txHost.tx.match.count({ where: { phaseId, playedAt: null } });
  }

  findPhaseById(phaseId: string): Promise<PhaseSummary | null> {
    return this.txHost.tx.phase.findUnique({
      where: { id: phaseId },
      select: { id: true, type: true, order: true, name: true },
    });
  }

  // Variante de findPhaseById que já confere o dono (tournamentId), igual o
  // que findMatchForGoals faz pra Match — pra validar a rota
  // tournaments/:id/phases/:phaseId/advance sem dar acesso a fase de outro
  // torneio.
  findPhaseForTournament(
    tournamentId: string,
    phaseId: string,
  ): Promise<PhaseSummary | null> {
    return this.txHost.tx.phase.findFirst({
      where: { id: phaseId, tournamentId },
      select: { id: true, type: true, order: true, name: true },
    });
  }

  async findMatchDetail(matchId: string): Promise<MatchDetail | null> {
    const match = await this.txHost.tx.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        groupLabel: true,
        round: true,
        playedAt: true,
        phase: { select: { tournamentId: true, order: true } },
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
      phaseOrder: match.phase.order,
      groupLabel: match.groupLabel,
      round: match.round,
      playedAt: match.playedAt,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      goals: match.goals.map((goal) => ({
        id: goal.id,
        scorer: toPlayerSummary(goal.scorer),
        assist: goal.assist ? toPlayerSummary(goal.assist) : null,
      })),
    };
  }

  // Elenco disponível pros seletores de artilheiro/assistência do drawer.
  async findPlayersByTeamIds(teamIds: string[]): Promise<PlayerSummary[]> {
    const players = await this.txHost.tx.player.findMany({
      where: { teamId: { in: teamIds } },
      orderBy: { name: 'asc' },
      select: PLAYER_SUMMARY_SELECT,
    });
    return players.map(toPlayerSummary);
  }

  async findPlayersByIds(playerIds: string[]): Promise<PlayerSummary[]> {
    const players = await this.txHost.tx.player.findMany({
      where: { id: { in: playerIds } },
      select: PLAYER_SUMMARY_SELECT,
    });
    return players.map(toPlayerSummary);
  }

  // Elenco com overall pra simulação de resultado (ver match-simulation.ts).
  async findPlayersForSimulation(
    teamIds: string[],
  ): Promise<SimulationRosterPlayer[]> {
    const players = await this.txHost.tx.player.findMany({
      where: { teamId: { in: teamIds } },
      select: {
        id: true,
        teamId: true,
        latestOverallRating: true,
        positions: { select: { position: true, isPrimary: true } },
      },
    });

    return players.map((player) => {
      const primary =
        player.positions.find((position) => position.isPrimary) ??
        player.positions[0];

      return {
        id: player.id,
        teamId: player.teamId,
        overallRating: player.latestOverallRating,
        position: primary?.position ?? 'ATA',
      };
    });
  }

  // Substitui todos os gols da partida pelos informados (o drawer sempre
  // manda a lista completa, não um diff) e marca a partida como jogada.
  // Chamador deve estar dentro de uma @Transactional() (ver tournaments.service).
  async replaceMatchGoals(
    matchId: string,
    goals: { scorerId: string; assistId: string | null }[],
  ): Promise<void> {
    await this.txHost.tx.goal.deleteMany({ where: { matchId } });
    if (goals.length > 0) {
      await this.txHost.tx.goal.createMany({
        data: goals.map((goal) => ({
          matchId,
          scorerId: goal.scorerId,
          assistId: goal.assistId,
        })),
      });
    }
    await this.txHost.tx.match.update({
      where: { id: matchId },
      data: { playedAt: new Date() },
    });
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

  // Quem controla cada time não é guardado no torneio: é derivado do Squad
  // da mesma temporada pro mesmo teamId. Time sem Squad = CPU (sem dono).
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
