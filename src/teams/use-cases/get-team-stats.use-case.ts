import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../../tournaments/tournaments.repository';
import { ResolveGoalLeadersUseCase } from '../../tournaments/use-cases';
import { TeamsRepository } from '../teams.repository';
import { TeamStats } from '../types';
import {
  computeHeadToHead,
  computeSeasonCampaign,
  toRecentMatches,
} from '../utils';

const TOP_TEAM_STATS_LIMIT = 3;
const RECENT_MATCHES_LIMIT = 10;

// Dono e campanha são da temporada efetiva do usuário (ownership e
// "campanha da temporada" só fazem sentido pra uma temporada por vez);
// últimos jogos, artilheiros, assistências e retrospecto por adversário
// são o histórico completo do clube, em qualquer temporada.
@Injectable()
export class GetTeamStatsUseCase {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly resolveGoalLeadersUseCase: ResolveGoalLeadersUseCase,
  ) {}

  async execute(teamId: string, seasonId: string): Promise<TeamStats> {
    const matches = await this.teamsRepository.findPlayedMatchesForTeam(teamId);

    const owner =
      (
        await this.tournamentsRepository.findOwnersByTeamIds([teamId], seasonId)
      ).get(teamId) ?? null;

    const [coins, couponBalance] = await Promise.all([
      this.teamsRepository.findCoinsByTeamId(teamId, seasonId),
      this.teamsRepository.findCouponBalanceByTeamId(teamId, seasonId),
    ]);

    const seasonCampaign = computeSeasonCampaign(matches, seasonId);

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
      coins,
      couponBalance,
      seasonCampaign,
      lastMatches: toRecentMatches(matches, RECENT_MATCHES_LIMIT),
      topScorers,
      topAssists,
      biggestVictim,
      biggestTormentor,
    };
  }
}
