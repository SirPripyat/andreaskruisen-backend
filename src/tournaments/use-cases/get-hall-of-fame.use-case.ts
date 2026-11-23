import { Injectable } from '@nestjs/common';
import { TournamentFormat } from '../../../generated/prisma/client';
import { TournamentsRepository } from '../tournaments.repository';
import { HallOfFame } from '../types';
import {
  buildPositionByPlayerId,
  countMatchesPerTeam,
  countTitlesPerTeam,
  toHallOfFameLeaders,
} from '../utils';
import { GetChampionTeamIdUseCase } from './get-champion-team-id.use-case';
import { ResolveGoalLeadersUseCase } from './resolve-goal-leaders.use-case';

// Independente do TOP_STATS_LIMIT usado no ranking por torneio (ver
// GetTopScorersUseCase/GetTopAssistsUseCase): o hall da fama é histórico,
// por isso mostra mais nomes.
const HALL_OF_FAME_LIMIT = 20;

// Sem limite real: usado só pro ranking "anterior" (ver positionChange),
// que precisa da lista inteira pra achar a posição de qualquer jogador do
// ranking atual, mesmo quem só entrou no top 20 agora.
const UNBOUNDED_LIMIT = Number.MAX_SAFE_INTEGER;

// Artilheiros e assistentes da temporada, somados entre todos os torneios
// já encerrados daquele formato — ver findTopScorersByFormat/
// findTopAssistsByFormat (torneios em andamento não contam: o placar
// poderia mudar antes de virar estatística histórica).
@Injectable()
export class GetHallOfFameUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly resolveGoalLeadersUseCase: ResolveGoalLeadersUseCase,
    private readonly getChampionTeamIdUseCase: GetChampionTeamIdUseCase,
  ) {}

  async execute(
    seasonId: string,
    format: TournamentFormat,
  ): Promise<HallOfFame> {
    // Precisa vir antes do Promise.all: é o torneio que o ranking
    // "anterior" vai excluir, pra medir o efeito dele no ranking atual
    // (ver GoalLeader.positionChange).
    const latestFinishedTournamentId =
      await this.tournamentsRepository.findLatestFinishedTournamentIdByFormat(
        seasonId,
        format,
      );

    const [
      topScorerRows,
      topAssistRows,
      playedMatchTeams,
      tournamentIds,
      previousTopScorerRows,
      previousTopAssistRows,
    ] = await Promise.all([
      this.tournamentsRepository.findTopScorersByFormat(
        seasonId,
        format,
        HALL_OF_FAME_LIMIT,
      ),
      this.tournamentsRepository.findTopAssistsByFormat(
        seasonId,
        format,
        HALL_OF_FAME_LIMIT,
      ),
      this.tournamentsRepository.findPlayedMatchTeamsByFormat(seasonId, format),
      this.tournamentsRepository.findFinishedTournamentIdsByFormat(
        seasonId,
        format,
      ),
      latestFinishedTournamentId
        ? this.tournamentsRepository.findTopScorersByFormat(
            seasonId,
            format,
            UNBOUNDED_LIMIT,
            latestFinishedTournamentId,
          )
        : Promise.resolve([]),
      latestFinishedTournamentId
        ? this.tournamentsRepository.findTopAssistsByFormat(
            seasonId,
            format,
            UNBOUNDED_LIMIT,
            latestFinishedTournamentId,
          )
        : Promise.resolve([]),
    ]);

    const [topScorers, topAssists, championTeamIds] = await Promise.all([
      this.resolveGoalLeadersUseCase.execute(topScorerRows),
      this.resolveGoalLeadersUseCase.execute(topAssistRows),
      Promise.all(
        tournamentIds.map((tournamentId) =>
          this.getChampionTeamIdUseCase.execute(tournamentId),
        ),
      ),
    ]);

    const matchesPerTeam = countMatchesPerTeam(playedMatchTeams);
    const titlesPerTeam = countTitlesPerTeam(championTeamIds);
    const previousScorerPositions = buildPositionByPlayerId(
      previousTopScorerRows,
    );
    const previousAssistPositions = buildPositionByPlayerId(
      previousTopAssistRows,
    );

    return {
      topScorers: toHallOfFameLeaders(
        topScorers,
        matchesPerTeam,
        titlesPerTeam,
        previousScorerPositions,
      ),
      topAssists: toHallOfFameLeaders(
        topAssists,
        matchesPerTeam,
        titlesPerTeam,
        previousAssistPositions,
      ),
    };
  }
}
