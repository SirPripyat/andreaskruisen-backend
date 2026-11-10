import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { determineChampionTeamId } from '../utils';
import { BuildGroupStandingsUseCase } from './build-group-standings.use-case';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

// Campeão da fase atual do torneio, ou null se ele ainda está em
// andamento ou não tem como ter um campeão único (ver regras em
// determineChampionTeamId). Usado por GetTitlesForTeamUseCase; não é
// exposto direto num endpoint porque sozinho não diz a quem pertence o
// título.
@Injectable()
export class GetChampionTeamIdUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
  ) {}

  async execute(tournamentId: string): Promise<string | null> {
    const tournament =
      await this.findTournamentOrThrowUseCase.execute(tournamentId);
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
          penaltyWinnerTeamId: match.penalties?.winnerTeamId ?? null,
        })),
      });
    }

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      latestPhase.id,
    );
    const standingsByGroup =
      await this.buildGroupStandingsUseCase.execute(groupMatches);
    return determineChampionTeamId({
      format: tournament.format,
      isLatestPhaseFullyPlayed,
      latestPhaseType: 'GROUP',
      standingsByGroup,
    });
  }
}
