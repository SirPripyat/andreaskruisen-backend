import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PaginatedResult } from '../commons/pagination';
import { FORMATION_DISPLAY_TO_ENUM } from '../import/utils/formation-mapper.utils';
import { SeasonsRepository } from '../seasons/seasons.repository';
import { TournamentsRepository } from '../tournaments/tournaments.repository';
import { TeamTitle } from '../tournaments/types';
import {
  GetTitlesForTeamUseCase,
  ResolveGoalLeadersUseCase,
} from '../tournaments/use-cases';
import { ListTeamsQuery } from './dto/list-teams.schema';
import { UpdateTeam } from './dto/update-team.schema';
import { TeamsRepository } from './teams.repository';
import { TeamStats, TeamWithRatings, UpdateTeamData } from './types';
import {
  computeHeadToHead,
  computeSeasonCampaign,
  toRecentMatches,
} from './utils';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
const TOP_TEAM_STATS_LIMIT = 3;
const RECENT_MATCHES_LIMIT = 10;

export type TeamDetail = TeamWithRatings & TeamStats;

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly resolveGoalLeadersUseCase: ResolveGoalLeadersUseCase,
    private readonly getTitlesForTeamUseCase: GetTitlesForTeamUseCase,
  ) {}

  list(query: ListTeamsQuery): Promise<PaginatedResult<TeamWithRatings>> {
    return this.teamsRepository.findPaginated(
      {
        name: query.name,
        leagueId: query.leagueId,
        withoutFormation: query.withoutFormation,
      },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }

  async getOne(id: string): Promise<TeamDetail> {
    const team = await this.findOrThrow(id);
    const stats = await this.getStats(id);
    return { ...team, ...stats };
  }

  async getTitles(id: string): Promise<TeamTitle[]> {
    await this.findOrThrow(id);
    return this.getTitlesForTeamUseCase.execute(id);
  }

  async update(id: string, dto: UpdateTeam): Promise<TeamDetail> {
    await this.findOrThrow(id);

    const data: UpdateTeamData = {
      name: dto.name,
      crestUrl: dto.crestUrl,
      leagueId: dto.leagueId,
      formation: dto.formation
        ? FORMATION_DISPLAY_TO_ENUM[dto.formation]
        : undefined,
    };

    try {
      await this.teamsRepository.update(id, data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ConflictException(
            'Já existe um time com esse nome nessa liga',
          );
        }
        if (error.code === FOREIGN_KEY_VIOLATION) {
          throw new BadRequestException('Liga não encontrada');
        }
      }
      throw error;
    }

    return this.getOne(id);
  }

  private async findOrThrow(id: string): Promise<TeamWithRatings> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }
    return team;
  }

  // Dono e campanha são da temporada ativa (ownership e "campanha da
  // temporada" só fazem sentido pra uma temporada por vez); últimos jogos,
  // artilheiros, assistências e retrospecto por adversário são o histórico
  // completo do clube, em qualquer temporada.
  private async getStats(teamId: string): Promise<TeamStats> {
    const [matches, activeSeason] = await Promise.all([
      this.teamsRepository.findPlayedMatchesForTeam(teamId),
      this.seasonsRepository.findActive(),
    ]);

    const owner = activeSeason
      ? ((
          await this.tournamentsRepository.findOwnersByTeamIds(
            [teamId],
            activeSeason.id,
          )
        ).get(teamId) ?? null)
      : null;

    const seasonCampaign = activeSeason
      ? computeSeasonCampaign(matches, activeSeason.id)
      : null;

    const { biggestVictim, biggestTormentor } = computeHeadToHead(matches);

    const [topScorersRaw, topAssistsRaw] = await Promise.all([
      this.teamsRepository.findTopScorersForTeam(teamId, TOP_TEAM_STATS_LIMIT),
      this.teamsRepository.findTopAssistsForTeam(teamId, TOP_TEAM_STATS_LIMIT),
    ]);
    const [topScorers, topAssists] = await Promise.all([
      this.resolveGoalLeadersUseCase.execute(topScorersRaw),
      this.resolveGoalLeadersUseCase.execute(topAssistsRaw),
    ]);

    return {
      owner,
      seasonCampaign,
      lastMatches: toRecentMatches(matches, RECENT_MATCHES_LIMIT),
      topScorers,
      topAssists,
      biggestVictim,
      biggestTormentor,
    };
  }
}
