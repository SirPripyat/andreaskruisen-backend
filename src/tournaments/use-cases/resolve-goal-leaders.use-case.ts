import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { GoalLeader } from '../types';
import { toPlayerOption } from '../utils';

// Resolve um ranking de { playerId, count } (artilheiros/assistências) pro
// jogador e time completos exibidos no front — usado tanto pro ranking do
// torneio inteiro quanto pro de um time específico (ver GetTopScorersUseCase,
// GetTopAssistsUseCase, GetTeamStatsUseCase e GetTournamentDashboardUseCase).
@Injectable()
export class ResolveGoalLeadersUseCase {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  async execute(
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
}
