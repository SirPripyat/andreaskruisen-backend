import { Injectable, NotFoundException } from '@nestjs/common';
import { TournamentsRepository } from '../../tournaments/tournaments.repository';
import { toPlayerOption } from '../../tournaments/utils';
import { MatchesRepository } from '../matches.repository';
import { MatchDetailResponse } from '../types';

@Injectable()
export class GetMatchDetailUseCase {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly tournamentsRepository: TournamentsRepository,
  ) {}

  async execute(matchId: string): Promise<MatchDetailResponse> {
    const match = await this.matchesRepository.findMatchDetail(matchId);

    if (!match) throw new NotFoundException('Partida não encontrada');

    const players = await this.matchesRepository.findPlayersByTeamIds(
      match.seasonId,
      [match.homeTeam.id, match.awayTeam.id],
    );

    const locked = await this.tournamentsRepository.hasLaterPhase(
      match.tournamentId,
      match.phaseOrder,
    );

    const homeTeam = {
      ...match.homeTeam,
      players: players
        .filter((player) => player.teamId === match.homeTeam.id)
        .map(toPlayerOption),
    };

    const awayTeam = {
      ...match.awayTeam,
      players: players
        .filter((player) => player.teamId === match.awayTeam.id)
        .map(toPlayerOption),
    };

    const goals = match.goals.map((goal) => ({
      id: goal.id,
      scorer: toPlayerOption(goal.scorer),
      assist: goal.assist ? toPlayerOption(goal.assist) : null,
    }));

    return {
      id: match.id,
      groupLabel: match.groupLabel,
      round: match.round,
      phaseType: match.phaseType,
      playedAt: match.playedAt,
      penalties: match.penalties,
      locked,
      homeTeam,
      awayTeam,
      goals,
    };
  }
}
