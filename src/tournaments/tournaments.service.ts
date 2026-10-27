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
  knockoutRoundName,
} from './match-generation';
import { simulateMatch } from './match-simulation';
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
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  // true = a fase seguinte já foi gerada a partir desta (ver
  // TournamentsService.advancePhase); resultado não pode mais ser editado.
  locked: boolean;
}

export interface MatchesPage extends PaginatedResult<MatchListItem> {
  phase: PhaseSummary;
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

export interface TournamentStats {
  topScorers: GoalLeader[];
  topAssists: GoalLeader[];
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
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
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
    const isKnockout = dto.format === 'KNOCKOUT';

    await this.tournamentsRepository.createPhaseWithMatches({
      tournamentId: tournament.id,
      type: isKnockout ? 'KNOCKOUT' : 'GROUP',
      order: 1,
      name: isKnockout
        ? knockoutRoundName(shuffledTeamIds.length, 1)
        : 'Fase de grupos',
      matches: isKnockout
        ? generateKnockoutMatches(shuffledTeamIds)
        : generateGroupStageMatches(shuffledTeamIds),
    });

    return tournament;
  }

  findBySeason(seasonId: string): Promise<Tournament[]> {
    return this.tournamentsRepository.findBySeason(seasonId);
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
    await this.findOrThrow(tournamentId);

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

    return {
      phase,
      ...result,
      data: result.data.map((match) => toMatchListItem(match, locked)),
    };
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

  // Ranking agregado do torneio inteiro (todas as fases) — artilheiros e
  // assistências, top 10.
  async getStats(tournamentId: string): Promise<TournamentStats> {
    await this.findOrThrow(tournamentId);

    const [topScorers, topAssists] = await Promise.all([
      this.tournamentsRepository.findTopScorers(tournamentId, TOP_STATS_LIMIT),
      this.tournamentsRepository.findTopAssists(tournamentId, TOP_STATS_LIMIT),
    ]);

    const playerIds = [
      ...new Set(
        [...topScorers, ...topAssists].map((leader) => leader.playerId),
      ),
    ];
    const players =
      await this.tournamentsRepository.findPlayersByIds(playerIds);
    const playerById = new Map(players.map((player) => [player.id, player]));

    const teamIds = [...new Set(players.map((player) => player.teamId))];
    const teams = await this.tournamentsRepository.findTeamsByIds(teamIds);
    const teamById = new Map(teams.map((team) => [team.id, team]));

    const toLeader = (leader: {
      playerId: string;
      count: number;
    }): GoalLeader | null => {
      const player = playerById.get(leader.playerId);
      const team = player && teamById.get(player.teamId);
      if (!player || !team) {
        return null;
      }
      return { player: toPlayerOption(player), team, count: leader.count };
    };

    return {
      topScorers: topScorers
        .map(toLeader)
        .filter((leader): leader is GoalLeader => leader !== null),
      topAssists: topAssists
        .map(toLeader)
        .filter((leader): leader is GoalLeader => leader !== null),
    };
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

  // Torneio GROUP_STAGE não tem próxima fase; só GROUP_STAGE_KNOCKOUT gera o
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
}
