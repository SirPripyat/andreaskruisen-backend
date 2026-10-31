import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  PositionCode,
  Prisma,
  Tournament,
  TournamentFormat,
} from '../../generated/prisma/client';
import { PaginatedResult } from '../commons/pagination';
import { shuffle } from '../commons/shuffle';
import { SeasonsRepository } from '../seasons/seasons.repository';
import { CreateTournament } from './dto/create-tournament.schema';
import { GetSituationQuery } from './dto/get-situation.schema';
import { ListMatchesQuery } from './dto/list-matches.schema';
import { ReplaceMatchGoals } from './dto/replace-match-goals.schema';
import { UpdateTournament } from './dto/update-tournament.schema';
import { computeGroupStandings, GroupStanding } from './group-standings';
import {
  GeneratedKnockoutMatch,
  generateGroupStageMatches,
  generateKnockoutMatches,
  generateLeagueMatches,
  knockoutRoundName,
} from './match-generation';
import { simulateMatch } from './match-simulation';
import { determineChampionTeamId } from './tournament-champion';
import {
  GroupPhaseMatch,
  MatchWithTeams,
  PhaseSummary,
  PlayerSummary,
  TeamOwner,
  TeamSummary,
  TournamentsRepository,
} from './tournaments.repository';

const TOP_STATS_LIMIT = 10;

const FOREIGN_KEY_VIOLATION = 'P2003';

export interface TournamentSummary {
  id: string;
  seasonId: string;
  name: string;
  format: TournamentFormat;
  maxTeams: number;
  createdAt: Date;
  // Fase em que o torneio está agora (a de maior order). Fases seguintes só
  // existem depois que a atual termina — ver geração por fase na criação.
  currentPhase: PhaseSummary | null;
}

export type StandingWithOwner = GroupStanding & { owner: TeamOwner | null };

export interface ConfrontoTeam extends TeamSummary {
  owner: TeamOwner | null;
}

export interface Confronto {
  id: string;
  homeTeam: ConfrontoTeam;
  awayTeam: ConfrontoTeam;
}

export type TournamentSituation = {
  phase: PhaseSummary;
} & (
  | { groups: Record<string, StandingWithOwner[]>; matches?: never }
  | { matches: Confronto[]; groups?: never }
);

export interface MatchListItem {
  id: string;
  groupLabel: string | null;
  round: number | null;
  // null = partida ainda não jogada (ver Match.playedAt).
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: ConfrontoTeam;
  awayTeam: ConfrontoTeam;
  // true = a fase seguinte já foi gerada a partir desta (ver
  // TournamentsService.advancePhase); resultado não pode mais ser editado.
  locked: boolean;
}

export interface MatchesPage extends PaginatedResult<MatchListItem> {
  phase: PhaseSummary;
}

export interface MatchesByPhase {
  phase: PhaseSummary;
  matches: MatchListItem[];
}

export interface MatchPlayerOption {
  id: string;
  name: string;
  photoUrl: string;
  position: PositionCode;
}

export interface MatchTeamWithPlayers extends TeamSummary {
  players: MatchPlayerOption[];
}

export interface MatchGoal {
  id: string;
  scorer: MatchPlayerOption;
  assist: MatchPlayerOption | null;
}

export interface MatchDetailResponse {
  id: string;
  groupLabel: string | null;
  round: number | null;
  playedAt: Date | null;
  homeTeam: MatchTeamWithPlayers;
  awayTeam: MatchTeamWithPlayers;
  goals: MatchGoal[];
  // true = a fase seguinte já foi gerada a partir desta (ver
  // TournamentsService.advancePhase); resultado não pode mais ser editado.
  locked: boolean;
}

export interface GoalLeader {
  player: MatchPlayerOption;
  team: TeamSummary;
  count: number;
}

export interface NextMatchSummary {
  id: string;
  phaseName: string;
  groupLabel: string | null;
  round: number | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
}

export interface TournamentDashboard {
  name: string;
  format: TournamentFormat;
  maxTeams: number;
  createdAt: Date;
  // Fase em que o torneio está agora (a de maior order).
  currentPhase: PhaseSummary | null;
  totalMatches: number;
  playedMatches: number;
  remainingMatches: number;
  topScorer: GoalLeader | null;
  topAssist: GoalLeader | null;
  nextMatch: NextMatchSummary | null;
}

export interface TeamTitle {
  tournamentId: string;
  tournamentName: string;
  format: TournamentFormat;
  seasonId: string;
  seasonName: string;
}

// Deriva o placar a partir de quem marcou cada gol — Match não guarda
// placar diretamente (ver comentário no schema do Match).
function computeMatchScore(
  homeTeamId: string,
  awayTeamId: string,
  goalScorerTeamIds: string[],
): { homeGoals: number; awayGoals: number } {
  let homeGoals = 0;
  let awayGoals = 0;
  for (const teamId of goalScorerTeamIds) {
    if (teamId === homeTeamId) {
      homeGoals++;
    } else if (teamId === awayTeamId) {
      awayGoals++;
    }
  }
  return { homeGoals, awayGoals };
}

function toMatchListItem(
  match: MatchWithTeams,
  locked: boolean,
  ownerByTeamId: Map<string, TeamOwner>,
): MatchListItem {
  const score = match.playedAt
    ? computeMatchScore(
        match.homeTeam.id,
        match.awayTeam.id,
        match.goalScorerTeamIds,
      )
    : null;

  return {
    id: match.id,
    groupLabel: match.groupLabel,
    round: match.round,
    homeScore: score?.homeGoals ?? null,
    awayScore: score?.awayGoals ?? null,
    homeTeam: {
      ...match.homeTeam,
      owner: ownerByTeamId.get(match.homeTeam.id) ?? null,
    },
    awayTeam: {
      ...match.awayTeam,
      owner: ownerByTeamId.get(match.awayTeam.id) ?? null,
    },
    locked,
  };
}

function toPlayerOption(player: PlayerSummary): MatchPlayerOption {
  return {
    id: player.id,
    name: player.name,
    photoUrl: player.photoUrl,
    position: player.position,
  };
}

@Injectable()
export class TournamentsService {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  // O elenco completo do torneio já entra na criação porque as partidas da
  // primeira fase são geradas aqui mesmo, na mesma transação (ver geração por
  // fase: a fase seguinte só é gerada depois que esta termina).
  @Transactional()
  async create(seasonId: string, dto: CreateTournament): Promise<Tournament> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    const tournament = await this.tournamentsRepository.create({
      seasonId,
      name: dto.name,
      format: dto.format,
      maxTeams: dto.maxTeams,
    });

    try {
      await this.tournamentsRepository.createTeams(tournament.id, dto.teamIds);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException('Time não encontrado');
      }
      throw error;
    }

    const shuffledTeamIds = shuffle(dto.teamIds);

    const firstPhase = this.buildFirstPhase(dto.format, shuffledTeamIds);
    await this.tournamentsRepository.createPhaseWithMatches({
      tournamentId: tournament.id,
      order: 1,
      ...firstPhase,
    });

    return tournament;
  }

  // Primeira fase do torneio, de acordo com o formato: LEAGUE é um turno
  // único com todos os times numa tabela só (sem mata-mata depois, ver
  // determineChampionTeamId); GROUP_STAGE_KNOCKOUT divide em grupos de 4,
  // cuja classificação alimenta o mata-mata gerado em advanceFromGroupStage;
  // KNOCKOUT já começa direto no mata-mata.
  private buildFirstPhase(
    format: TournamentFormat,
    shuffledTeamIds: string[],
  ): {
    type: 'GROUP' | 'KNOCKOUT';
    name: string;
    matches: {
      homeTeamId: string;
      awayTeamId: string;
      groupLabel?: string;
      round?: number;
    }[];
  } {
    if (format === 'KNOCKOUT') {
      return {
        type: 'KNOCKOUT',
        name: knockoutRoundName(shuffledTeamIds.length, 1),
        matches: generateKnockoutMatches(shuffledTeamIds),
      };
    }

    if (format === 'GROUP_STAGE_KNOCKOUT') {
      return {
        type: 'GROUP',
        name: 'Fase de grupos',
        matches: generateGroupStageMatches(shuffledTeamIds),
      };
    }

    return {
      type: 'GROUP',
      name: 'Liga',
      matches: generateLeagueMatches(shuffledTeamIds),
    };
  }

  findBySeason(seasonId: string): Promise<Tournament[]> {
    return this.tournamentsRepository.findBySeason(seasonId);
  }

  // Usado pra travar transferências (ver TransfersService): um torneio está
  // "ativo" até sua última fase possível terminar. Espelha a mesma condição
  // de parada de advancePhase/advanceFromGroupStage/advanceKnockoutRound,
  // sem tocar nos dados (nenhuma fase nova é gerada aqui).
  async hasActiveTournament(seasonId: string): Promise<boolean> {
    const tournaments = await this.tournamentsRepository.findBySeason(seasonId);

    for (const tournament of tournaments) {
      const latestPhase = await this.tournamentsRepository.findLatestPhase(
        tournament.id,
      );
      if (!latestPhase) {
        return true;
      }

      const unplayedCount =
        await this.tournamentsRepository.countUnplayedMatches(latestPhase.id);
      if (unplayedCount > 0) {
        return true;
      }

      if (tournament.format === 'LEAGUE') {
        continue;
      }

      if (latestPhase.type === 'GROUP') {
        return true;
      }

      const matchCount = await this.tournamentsRepository.countMatches(
        latestPhase.id,
      );
      if (matchCount > 1) {
        return true;
      }
    }

    return false;
  }

  // GET principal: só o resumo do torneio, sem times nem partidas (ver
  // getSituation e getMatches pra isso).
  async getOne(tournamentId: string): Promise<TournamentSummary> {
    const tournament = await this.findOrThrow(tournamentId);
    const currentPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);

    return {
      id: tournament.id,
      seasonId: tournament.seasonId,
      name: tournament.name,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      createdAt: tournament.createdAt,
      currentPhase,
    };
  }

  // Situação de uma fase: classificação por grupo (GROUP) ou os confrontos
  // (KNOCKOUT). Sem `round`, usa a fase atual — mas o front também precisa
  // conseguir pedir uma fase já concluída (ex.: ver a classificação da fase
  // de grupos depois que o mata-mata já começou), daí o mesmo parâmetro
  // `round` (Phase.order) que já existe em getMatches. `onlyOwnedTeams`
  // esconde grupos/confrontos sem nenhum time com dono (Squad) na temporada,
  // ou seja, só de CPU.
  async getSituation(
    tournamentId: string,
    query: GetSituationQuery,
  ): Promise<TournamentSituation> {
    const tournament = await this.findOrThrow(tournamentId);
    const phase = query.round
      ? await this.tournamentsRepository.findPhaseByOrder(
          tournamentId,
          query.round,
        )
      : await this.tournamentsRepository.findLatestPhase(tournamentId);
    if (!phase) {
      throw new NotFoundException(
        query.round
          ? 'Rodada não encontrada'
          : 'Torneio ainda não tem fase gerada',
      );
    }

    if (phase.type === 'KNOCKOUT') {
      return {
        phase,
        matches: await this.buildConfrontos(
          phase.id,
          tournament.seasonId,
          query.onlyOwnedTeams,
        ),
      };
    }

    return {
      phase,
      groups: await this.buildGroupsWithOwners(
        phase.id,
        tournament.seasonId,
        query.onlyOwnedTeams,
      ),
    };
  }

  // Partidas da rodada (fase), paginadas. Sem `round`, usa a fase atual —
  // "quem vai pegar quem" nessa rodada, não o histórico inteiro do torneio.
  async getMatches(
    tournamentId: string,
    query: ListMatchesQuery,
  ): Promise<MatchesPage> {
    const tournament = await this.findOrThrow(tournamentId);

    const phase = query.round
      ? await this.tournamentsRepository.findPhaseByOrder(
          tournamentId,
          query.round,
        )
      : await this.tournamentsRepository.findLatestPhase(tournamentId);

    if (!phase) {
      throw new NotFoundException(
        query.round
          ? 'Rodada não encontrada'
          : 'Torneio ainda não tem fase gerada',
      );
    }

    const result = await this.tournamentsRepository.findPaginatedMatches(
      phase.id,
      query,
    );
    const locked = await this.tournamentsRepository.hasLaterPhase(
      tournamentId,
      phase.order,
    );
    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [
        ...new Set(
          result.data.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]),
        ),
      ],
      tournament.seasonId,
    );

    return {
      phase,
      ...result,
      data: result.data.map((match) =>
        toMatchListItem(match, locked, ownerByTeamId),
      ),
    };
  }

  // Histórico completo de partidas do torneio, por fase (grupos e depois
  // mata-mata), já com dono do time e travamento resolvidos. Substitui o
  // front buscar cada fase separadamente em /matches?round=N e juntar o
  // resultado — mesma ideia de centralização de getDashboard.
  async getFixtures(tournamentId: string): Promise<MatchesByPhase[]> {
    const tournament = await this.findOrThrow(tournamentId);

    const phases =
      await this.tournamentsRepository.findPhasesByTournament(tournamentId);
    if (phases.length === 0) {
      return [];
    }

    const matchesByPhase = await Promise.all(
      phases.map((phase) =>
        this.tournamentsRepository.findMatchesByPhase(phase.id),
      ),
    );

    // Só a última fase (maior order) ainda pode ter resultado editado — ver
    // hasLaterPhase, cuja condição é equivalente aqui já que `phases` está
    // ordenada por order.
    const latestOrder = phases[phases.length - 1].order;

    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [
        ...new Set(
          matchesByPhase
            .flat()
            .flatMap((match) => [match.homeTeam.id, match.awayTeam.id]),
        ),
      ],
      tournament.seasonId,
    );

    return phases.map((phase, index) => ({
      phase,
      matches: matchesByPhase[index].map((match) =>
        toMatchListItem(match, phase.order < latestOrder, ownerByTeamId),
      ),
    }));
  }

  // Detalhe de uma partida pro drawer de registro de gols: times com elenco
  // (pra escolher artilheiro/assistência) e os gols já registrados.
  async getMatchDetail(
    tournamentId: string,
    matchId: string,
  ): Promise<MatchDetailResponse> {
    const match = await this.tournamentsRepository.findMatchDetail(matchId);
    if (!match || match.tournamentId !== tournamentId) {
      throw new NotFoundException('Partida não encontrada');
    }

    const players = await this.tournamentsRepository.findPlayersByTeamIds([
      match.homeTeam.id,
      match.awayTeam.id,
    ]);
    const locked = await this.tournamentsRepository.hasLaterPhase(
      tournamentId,
      match.phaseOrder,
    );

    return {
      id: match.id,
      groupLabel: match.groupLabel,
      round: match.round,
      playedAt: match.playedAt,
      locked,
      homeTeam: {
        ...match.homeTeam,
        players: players
          .filter((player) => player.teamId === match.homeTeam.id)
          .map(toPlayerOption),
      },
      awayTeam: {
        ...match.awayTeam,
        players: players
          .filter((player) => player.teamId === match.awayTeam.id)
          .map(toPlayerOption),
      },
      goals: match.goals.map((goal) => ({
        id: goal.id,
        scorer: toPlayerOption(goal.scorer),
        assist: goal.assist ? toPlayerOption(goal.assist) : null,
      })),
    };
  }

  // Substitui a lista de gols da partida (o drawer sempre manda a lista
  // inteira) e devolve o detalhe atualizado. Só admin registra resultado,
  // igual elenco/times (ver AdminGuard no controller). Travada (ver
  // advancePhase) se a fase seguinte já foi gerada a partir desta partida —
  // senão a correção quebraria o chaveamento/classificação já montado.
  @Transactional()
  async replaceMatchGoals(
    tournamentId: string,
    matchId: string,
    dto: ReplaceMatchGoals,
  ): Promise<MatchDetailResponse> {
    const match = await this.tournamentsRepository.findMatchForGoals(matchId);
    if (!match || match.tournamentId !== tournamentId) {
      throw new NotFoundException('Partida não encontrada');
    }

    const locked = await this.tournamentsRepository.hasLaterPhase(
      tournamentId,
      match.phaseOrder,
    );
    if (locked) {
      throw new ConflictException(
        'Partida travada: a fase seguinte já foi gerada a partir dela',
      );
    }

    const playerIds = [
      ...new Set(
        dto.goals.flatMap((goal) =>
          goal.assistId ? [goal.scorerId, goal.assistId] : [goal.scorerId],
        ),
      ),
    ];
    const players =
      await this.tournamentsRepository.findPlayersByIds(playerIds);
    const teamIdByPlayerId = new Map(
      players.map((player) => [player.id, player.teamId]),
    );
    const matchTeamIds = new Set([match.homeTeamId, match.awayTeamId]);

    for (const goal of dto.goals) {
      const scorerTeamId = teamIdByPlayerId.get(goal.scorerId);
      if (!scorerTeamId || !matchTeamIds.has(scorerTeamId)) {
        throw new BadRequestException(
          'Artilheiro precisa ser de um dos times da partida',
        );
      }

      if (
        goal.assistId &&
        teamIdByPlayerId.get(goal.assistId) !== scorerTeamId
      ) {
        throw new BadRequestException(
          'Assistência precisa ser do mesmo time do artilheiro',
        );
      }
    }

    await this.tournamentsRepository.replaceMatchGoals(
      matchId,
      dto.goals.map((goal) => ({
        scorerId: goal.scorerId,
        assistId: goal.assistId ?? null,
      })),
    );

    return this.getMatchDetail(tournamentId, matchId);
  }

  // Gera um resultado automático (pesado pela força dos elencos, ver
  // match-simulation.ts) e grava igual a um resultado manual. Só admin, e só
  // pra partida ainda não jogada — resimular uma já jogada precisa primeiro
  // reverter o resultado (não existe esse endpoint ainda).
  @Transactional()
  async simulateMatch(
    tournamentId: string,
    matchId: string,
  ): Promise<MatchDetailResponse> {
    const match = await this.tournamentsRepository.findMatchForGoals(matchId);
    if (!match || match.tournamentId !== tournamentId) {
      throw new NotFoundException('Partida não encontrada');
    }
    if (match.playedAt) {
      throw new ConflictException('Partida já tem resultado registrado');
    }

    const roster = await this.tournamentsRepository.findPlayersForSimulation([
      match.homeTeamId,
      match.awayTeamId,
    ]);
    const homeRoster = roster.filter((p) => p.teamId === match.homeTeamId);
    const awayRoster = roster.filter((p) => p.teamId === match.awayTeamId);

    if (homeRoster.length === 0 || awayRoster.length === 0) {
      throw new BadRequestException(
        'Um dos times não tem jogadores cadastrados pra simular',
      );
    }

    const result = simulateMatch(homeRoster, awayRoster);

    await this.tournamentsRepository.replaceMatchGoals(matchId, [
      ...result.homeGoals,
      ...result.awayGoals,
    ]);

    return this.getMatchDetail(tournamentId, matchId);
  }

  // Ranking de artilheiros do torneio inteiro (todas as fases), top 10.
  async getTopScorers(tournamentId: string): Promise<GoalLeader[]> {
    await this.findOrThrow(tournamentId);

    const topScorers = await this.tournamentsRepository.findTopScorers(
      tournamentId,
      TOP_STATS_LIMIT,
    );
    return this.resolveGoalLeaders(topScorers);
  }

  // Ranking de assistências do torneio inteiro (todas as fases), top 10.
  async getTopAssists(tournamentId: string): Promise<GoalLeader[]> {
    await this.findOrThrow(tournamentId);

    const topAssists = await this.tournamentsRepository.findTopAssists(
      tournamentId,
      TOP_STATS_LIMIT,
    );
    return this.resolveGoalLeaders(topAssists);
  }

  private async resolveGoalLeaders(
    leaders: { playerId: string; count: number }[],
  ): Promise<GoalLeader[]> {
    const playerIds = [...new Set(leaders.map((leader) => leader.playerId))];
    const players =
      await this.tournamentsRepository.findPlayersByIds(playerIds);
    const playerById = new Map(players.map((player) => [player.id, player]));

    const teamIds = [...new Set(players.map((player) => player.teamId))];
    const teams = await this.tournamentsRepository.findTeamsByIds(teamIds);
    const teamById = new Map(teams.map((team) => [team.id, team]));

    return leaders
      .map((leader): GoalLeader | null => {
        const player = playerById.get(leader.playerId);
        const team = player && teamById.get(player.teamId);
        if (!player || !team) {
          return null;
        }
        return { player: toPlayerOption(player), team, count: leader.count };
      })
      .filter((leader): leader is GoalLeader => leader !== null);
  }

  // Resumo pro dashboard do torneio: progresso de jogos da fase atual,
  // artilheiro/garçom geral e a próxima partida pendente — antes calculado no
  // front em cima de /matches e /stats, centralizado aqui.
  async getDashboard(tournamentId: string): Promise<TournamentDashboard> {
    const tournament = await this.findOrThrow(tournamentId);

    const currentPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);
    const matches = currentPhase
      ? await this.tournamentsRepository.findMatchesByPhase(currentPhase.id)
      : [];

    // Times sem Squad na temporada são CPU — a próxima partida só interessa
    // pro dashboard se pelo menos um dos lados tiver um dono real.
    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [...new Set(matches.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]))],
      tournament.seasonId,
    );
    // findMatchesByPhase já ordena por createdAt/id — a primeira sem
    // playedAt entre os confrontos com dono é a próxima partida a disputar.
    const nextMatch = matches.find(
      (match) =>
        match.playedAt === null &&
        (ownerByTeamId.has(match.homeTeam.id) ||
          ownerByTeamId.has(match.awayTeam.id)),
    );

    const [topScorer] = await this.tournamentsRepository.findTopScorers(
      tournamentId,
      1,
    );
    const [topAssist] = await this.tournamentsRepository.findTopAssists(
      tournamentId,
      1,
    );
    const [topScorerLeader, topAssistLeader] = await Promise.all([
      topScorer ? this.resolveGoalLeader(topScorer) : null,
      topAssist ? this.resolveGoalLeader(topAssist) : null,
    ]);

    const playedMatches = matches.filter(
      (match) => match.playedAt !== null,
    ).length;

    return {
      name: tournament.name,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      createdAt: tournament.createdAt,
      currentPhase,
      totalMatches: matches.length,
      playedMatches,
      remainingMatches: matches.length - playedMatches,
      topScorer: topScorerLeader,
      topAssist: topAssistLeader,
      nextMatch:
        nextMatch && currentPhase
          ? {
              id: nextMatch.id,
              phaseName: currentPhase.name,
              groupLabel: nextMatch.groupLabel,
              round: nextMatch.round,
              homeTeam: nextMatch.homeTeam,
              awayTeam: nextMatch.awayTeam,
            }
          : null,
    };
  }

  private async resolveGoalLeader(leader: {
    playerId: string;
    count: number;
  }): Promise<GoalLeader | null> {
    const [player] = await this.tournamentsRepository.findPlayersByIds([
      leader.playerId,
    ]);
    if (!player) {
      return null;
    }

    const [team] = await this.tournamentsRepository.findTeamsByIds([
      player.teamId,
    ]);
    if (!team) {
      return null;
    }

    return { player: toPlayerOption(player), team, count: leader.count };
  }

  async update(
    tournamentId: string,
    dto: UpdateTournament,
  ): Promise<Tournament> {
    await this.findOrThrow(tournamentId);
    return this.tournamentsRepository.update(tournamentId, {
      name: dto.name,
    });
  }

  @Transactional()
  async remove(tournamentId: string): Promise<void> {
    await this.findOrThrow(tournamentId);

    await this.tournamentsRepository.removeAllMatches(tournamentId);
    await this.tournamentsRepository.removeAllPhases(tournamentId);
    await this.tournamentsRepository.removeAllTeams(tournamentId);
    await this.tournamentsRepository.delete(tournamentId);
  }

  private async buildConfrontos(
    phaseId: string,
    seasonId: string,
    onlyOwnedTeams: boolean,
  ): Promise<Confronto[]> {
    const matches =
      await this.tournamentsRepository.findMatchesByPhase(phaseId);
    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [...new Set(matches.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]))],
      seasonId,
    );

    const confrontos = matches.map((match) =>
      this.toConfronto(match, ownerByTeamId),
    );

    return onlyOwnedTeams
      ? confrontos.filter((c) => c.homeTeam.owner || c.awayTeam.owner)
      : confrontos;
  }

  private toConfronto(
    match: MatchWithTeams,
    ownerByTeamId: Map<string, TeamOwner>,
  ): Confronto {
    return {
      id: match.id,
      homeTeam: {
        ...match.homeTeam,
        owner: ownerByTeamId.get(match.homeTeam.id) ?? null,
      },
      awayTeam: {
        ...match.awayTeam,
        owner: ownerByTeamId.get(match.awayTeam.id) ?? null,
      },
    };
  }

  private async buildGroupsWithOwners(
    phaseId: string,
    seasonId: string,
    onlyOwnedTeams: boolean,
  ): Promise<Record<string, StandingWithOwner[]>> {
    const groupMatches =
      await this.tournamentsRepository.findGroupMatches(phaseId);
    const standingsByGroup = await this.buildStandingsByGroup(groupMatches);

    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [...new Set(groupMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))],
      seasonId,
    );

    const groupsWithOwners: Record<string, StandingWithOwner[]> = {};
    for (const [groupLabel, standings] of Object.entries(standingsByGroup)) {
      const withOwners = standings.map((standing) => ({
        ...standing,
        owner: ownerByTeamId.get(standing.teamId) ?? null,
      }));

      if (!onlyOwnedTeams || withOwners.some((s) => s.owner)) {
        groupsWithOwners[groupLabel] = withOwners;
      }
    }

    return groupsWithOwners;
  }

  private async buildStandingsByGroup(
    groupMatches: GroupPhaseMatch[],
  ): Promise<Record<string, GroupStanding[]>> {
    const teamIds = [
      ...new Set(
        groupMatches.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
      ),
    ];
    const teams = await this.tournamentsRepository.findTeamsByIds(teamIds);
    const teamById = new Map(teams.map((team) => [team.id, team]));

    const matchesByGroup = new Map<string, GroupPhaseMatch[]>();
    for (const match of groupMatches) {
      const group = matchesByGroup.get(match.groupLabel) ?? [];
      group.push(match);
      matchesByGroup.set(match.groupLabel, group);
    }

    const standingsByGroup: Record<string, GroupStanding[]> = {};
    for (const [groupLabel, matches] of matchesByGroup) {
      const groupTeamIds = [
        ...new Set(
          matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
        ),
      ];
      const groupTeams = groupTeamIds
        .map((id) => teamById.get(id))
        .filter((team): team is TeamSummary => team !== undefined);

      standingsByGroup[groupLabel] = computeGroupStandings(
        groupTeams,
        matches.map((match) => ({
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          result: match.playedAt
            ? computeMatchScore(
                match.homeTeamId,
                match.awayTeamId,
                match.goalScorerTeamIds,
              )
            : null,
        })),
      );
    }

    return standingsByGroup;
  }

  // Gera a próxima fase a partir da fase informada: de GROUP pra KNOCKOUT
  // (classificados dos grupos) ou de uma rodada de mata-mata pra seguinte
  // (vencedores avançam). Endpoint próprio e só admin (ver controller) —
  // deixa de ser automático pra não gerar o mata-mata sozinho a cada gol
  // registrado, e pra travar a edição das partidas desta fase assim que a
  // seguinte existir (ver replaceMatchGoals/hasLaterPhase).
  @Transactional()
  async advancePhase(tournamentId: string, phaseId: string): Promise<void> {
    await this.findOrThrow(tournamentId);

    const phase = await this.tournamentsRepository.findPhaseForTournament(
      tournamentId,
      phaseId,
    );
    if (!phase) {
      throw new NotFoundException('Fase não encontrada');
    }

    const latestPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);
    if (latestPhase?.id !== phase.id) {
      throw new ConflictException(
        'Só é possível avançar a partir da fase atual do torneio',
      );
    }

    const unplayedCount =
      await this.tournamentsRepository.countUnplayedMatches(phaseId);
    if (unplayedCount > 0) {
      throw new ConflictException('Ainda há partida sem resultado nesta fase');
    }

    if (phase.type === 'GROUP') {
      await this.advanceFromGroupStage(tournamentId, phase);
      return;
    }

    await this.advanceKnockoutRound(tournamentId, phase);
  }

  // Torneio LEAGUE não tem próxima fase; só GROUP_STAGE_KNOCKOUT gera o
  // mata-mata com os 2 primeiros de cada grupo. Chaveamento: o 1º de cada
  // grupo enfrenta o 2º do grupo seguinte (nunca o do próprio grupo), numa
  // lista de grupos ordenada por groupLabel.
  private async advanceFromGroupStage(
    tournamentId: string,
    phase: PhaseSummary,
  ): Promise<void> {
    const tournament = await this.tournamentsRepository.findById(tournamentId);
    if (tournament?.format !== 'GROUP_STAGE_KNOCKOUT') {
      throw new ConflictException('Este torneio não tem fase de mata-mata');
    }

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      phase.id,
    );
    const standingsByGroup = await this.buildStandingsByGroup(groupMatches);
    const groupLabels = Object.keys(standingsByGroup).sort();

    const firstPlaced = groupLabels.map((label) => standingsByGroup[label][0]);
    const secondPlaced = groupLabels.map((label) => standingsByGroup[label][1]);

    const matches = firstPlaced.map((first, i) => ({
      homeTeamId: first.teamId,
      awayTeamId: secondPlaced[(i + 1) % secondPlaced.length].teamId,
    }));

    await this.createNextKnockoutPhase(tournamentId, phase.order, matches);
  }

  // Fase KNOCKOUT com 1 partida já é a final — não há próxima rodada.
  // Senão, o vencedor de cada partida avança; partidas adjacentes (na ordem
  // em que foram geradas, ver generateKnockoutMatches) se enfrentam na
  // rodada seguinte, preservando o chaveamento original.
  private async advanceKnockoutRound(
    tournamentId: string,
    phase: PhaseSummary,
  ): Promise<void> {
    const matches = await this.tournamentsRepository.findMatchesByPhase(
      phase.id,
    );
    if (matches.length <= 1) {
      throw new ConflictException('Esta já é a fase final do torneio');
    }

    const winnerTeamIds: string[] = [];
    for (const match of matches) {
      const score = computeMatchScore(
        match.homeTeam.id,
        match.awayTeam.id,
        match.goalScorerTeamIds,
      );
      if (score.homeGoals === score.awayGoals) {
        // Empate em mata-mata ainda não tem resolução automática (sem
        // pênaltis) — não avança até o placar ser corrigido pra um vencedor.
        throw new ConflictException(
          'Existe partida empatada nesta fase; corrija o resultado antes de avançar',
        );
      }
      winnerTeamIds.push(
        score.homeGoals > score.awayGoals
          ? match.homeTeam.id
          : match.awayTeam.id,
      );
    }

    const nextMatches: GeneratedKnockoutMatch[] = [];
    for (let i = 0; i < winnerTeamIds.length; i += 2) {
      nextMatches.push({
        homeTeamId: winnerTeamIds[i],
        awayTeamId: winnerTeamIds[i + 1],
      });
    }

    await this.createNextKnockoutPhase(tournamentId, phase.order, nextMatches);
  }

  private async createNextKnockoutPhase(
    tournamentId: string,
    currentOrder: number,
    matches: GeneratedKnockoutMatch[],
  ): Promise<void> {
    const nextOrder = currentOrder + 1;
    await this.tournamentsRepository.createPhaseWithMatches({
      tournamentId,
      type: 'KNOCKOUT',
      order: nextOrder,
      name: knockoutRoundName(matches.length * 2, nextOrder),
      matches,
    });
  }

  private async findOrThrow(tournamentId: string): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Torneio não encontrado');
    }
    return tournament;
  }

  // Campeão da fase atual do torneio, ou null se ele ainda está em
  // andamento ou não tem como ter um campeão único (ver regras em
  // determineChampionTeamId). Usado por getTitlesForTeam; não é exposto
  // direto num endpoint porque sozinho não diz a quem pertence o título.
  async getChampionTeamId(tournamentId: string): Promise<string | null> {
    const tournament = await this.findOrThrow(tournamentId);
    const latestPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);
    if (!latestPhase) {
      return null;
    }

    const unplayedCount = await this.tournamentsRepository.countUnplayedMatches(
      latestPhase.id,
    );
    const isLatestPhaseFullyPlayed = unplayedCount === 0;

    if (latestPhase.type === 'KNOCKOUT') {
      const matches = await this.tournamentsRepository.findMatchesByPhase(
        latestPhase.id,
      );
      return determineChampionTeamId({
        format: tournament.format,
        isLatestPhaseFullyPlayed,
        latestPhaseType: 'KNOCKOUT',
        knockoutMatches: matches.map((match) => ({
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          goalScorerTeamIds: match.goalScorerTeamIds,
        })),
      });
    }

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      latestPhase.id,
    );
    const standingsByGroup = await this.buildStandingsByGroup(groupMatches);
    return determineChampionTeamId({
      format: tournament.format,
      isLatestPhaseFullyPlayed,
      latestPhaseType: 'GROUP',
      standingsByGroup,
    });
  }

  // Histórico de títulos de um time (independente de quem o comandou em
  // cada temporada, já que TournamentTeam aponta pro Team real — ver
  // schema). Percorre todos os torneios de que o time já participou, em
  // qualquer temporada, e verifica se ele foi o campeão de cada um.
  async getTitlesForTeam(teamId: string): Promise<TeamTitle[]> {
    const tournaments =
      await this.tournamentsRepository.findTournamentsByTeam(teamId);

    const titles: TeamTitle[] = [];
    for (const tournament of tournaments) {
      const championTeamId = await this.getChampionTeamId(
        tournament.tournamentId,
      );
      if (championTeamId === teamId) {
        titles.push(tournament);
      }
    }
    return titles;
  }
}
