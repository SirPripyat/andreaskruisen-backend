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
import { TeamMatchResult } from './team-campaign';

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

export interface MatchPenalties {
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
}

export interface MatchWithTeams {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  goalScorerTeamIds: string[];
  penalties: MatchPenalties | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
}

export interface MatchForGoals {
  id: string;
  tournamentId: string;
  // Temporada do torneio — usada pra resolver o elenco atual (ver
  // PlayerTeamAssignment) na hora de validar/simular gols, já que as trocas
  // mudam quem joga por qual time sem tocar em Player.teamId.
  seasonId: string;
  phaseId: string;
  // Order (Phase.order) da fase da partida — usado pra saber se a partida
  // está travada (ver TournamentsRepository.hasLaterPhase).
  phaseOrder: number;
  // Eliminatória (ver TournamentsService.replaceMatchGoals/simulateMatch):
  // não pode terminar empatada, precisa de pênaltis.
  phaseType: PhaseType;
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
  // Ver comentário equivalente em MatchForGoals.
  seasonId: string;
  phaseOrder: number;
  phaseType: PhaseType;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  penalties: MatchPenalties | null;
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
  penaltyHomeScore: true,
  penaltyAwayScore: true,
  penaltyWinnerTeamId: true,
  homeTeam: { select: { id: true, name: true, crestUrl: true } },
  awayTeam: { select: { id: true, name: true, crestUrl: true } },
  goals: { select: { teamId: true } },
} as const;

// Pênaltis só existem como conjunto completo (os três campos preenchidos
// juntos, ver TournamentsRepository.replaceMatchGoals) — nunca parcial.
function toPenalties(match: {
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  penaltyWinnerTeamId: string | null;
}): MatchPenalties | null {
  if (
    match.penaltyHomeScore === null ||
    match.penaltyAwayScore === null ||
    match.penaltyWinnerTeamId === null
  ) {
    return null;
  }
  return {
    homeScore: match.penaltyHomeScore,
    awayScore: match.penaltyAwayScore,
    winnerTeamId: match.penaltyWinnerTeamId,
  };
}

function toMatchWithTeams(match: {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  penaltyWinnerTeamId: string | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  goals: { teamId: string }[];
}): MatchWithTeams {
  return {
    id: match.id,
    groupLabel: match.groupLabel,
    round: match.round,
    playedAt: match.playedAt,
    penalties: toPenalties(match),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    goalScorerTeamIds: match.goals.map((goal) => goal.teamId),
  };
}

// Sem teamId: usado quando o time vem de outra fonte (PlayerTeamAssignment
// da temporada), não do Player — ver findPlayersByTeamIds.
const PLAYER_SELECT_FOR_SUMMARY = {
  id: true,
  name: true,
  photoUrl: true,
  positions: { select: { position: true, isPrimary: true } },
} as const;

const PLAYER_SUMMARY_SELECT = {
  ...PLAYER_SELECT_FOR_SUMMARY,
  teamId: true,
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

  // Torneios de que um time (real, não o elenco de um participante numa
  // temporada) já participou, em qualquer temporada — ver TeamsService
  // getTitles. TournamentTeam aponta direto pro Team, então isso cobre o
  // histórico completo do clube, independente de quem o controlou.
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

  // Todas as fases do torneio, da primeira à atual — usado em getFixtures
  // pra montar o histórico completo de uma vez, sem uma query por fase.
  findPhasesByTournament(tournamentId: string): Promise<PhaseSummary[]> {
    return this.txHost.tx.phase.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
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

  // Pra saber se uma fase KNOCKOUT é a final (1 só partida) sem carregar as
  // partidas inteiras — ver TournamentsService.hasActiveTournament.
  countMatches(phaseId: string): Promise<number> {
    return this.txHost.tx.match.count({ where: { phaseId } });
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

  // Elenco ATUAL da temporada (PlayerTeamAssignment) de cada time, pros
  // seletores de artilheiro/assistência do drawer — não o elenco real
  // estático do SoFIFA (Player.teamId): uma troca muda quem joga por qual
  // time nessa temporada sem tocar em Player.teamId.
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

  // Usado só pra exibição de estatísticas históricas (ranking de artilheiros/
  // assistências e resumo do time) — ali o time mostrado é o elenco real
  // estático (Player.teamId), não o da temporada; ver tournaments.service.ts.
  async findPlayersByIds(playerIds: string[]): Promise<PlayerSummary[]> {
    const players = await this.txHost.tx.player.findMany({
      where: { id: { in: playerIds } },
      select: PLAYER_SUMMARY_SELECT,
    });
    return players.map(toPlayerSummary);
  }

  // Time ATUAL da temporada de cada jogador informado — pra validar se o
  // artilheiro/assistência pertence a um dos times da partida (ver
  // TournamentsService.replaceMatchGoals). Usa PlayerTeamAssignment, não
  // Player.teamId: uma troca muda quem representa qual time nessa temporada.
  findAssignedTeamsByPlayerIds(
    seasonId: string,
    playerIds: string[],
  ): Promise<{ playerId: string; teamId: string }[]> {
    return this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, playerId: { in: playerIds } },
      select: { playerId: true, teamId: true },
    });
  }

  // Elenco ATUAL da temporada com overall pra simulação de resultado (ver
  // match-simulation.ts) — reflete trocas já aplicadas. Só os titulares
  // (PlayerTeamAssignment.isStarter) podem marcar gol ou dar assistência; se
  // o time não tem nenhum titular (isStarter) marcado, cai pro elenco
  // inteiro (mesmo fallback usado pra média de overall em teams.repository).
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
          position: primary?.position ?? 'ATA',
        };
      });
  }

  // Substitui todos os gols da partida pelos informados (o drawer sempre
  // manda a lista completa, não um diff) e marca a partida como jogada.
  // `penalties` null limpa um resultado de pênaltis anterior (ex.: resultado
  // corrigido pra não empatar mais). Chamador deve estar dentro de uma
  // @Transactional() (ver tournaments.service).
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

  // Todo jogo já disputado pelo time (real, qualquer temporada/torneio),
  // do ponto de vista dele — já resolve quem foi o adversário e goals
  // pró/contra em vez de homeGoals/awayGoals, pra TeamsService não precisar
  // saber qual lado o time jogou. Ordenado do mais recente pro mais antigo
  // pra alimentar tanto "últimos 10 jogos" quanto a campanha da temporada
  // (ver computeSeasonCampaign/toRecentMatches/computeHeadToHead).
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
