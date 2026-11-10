import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { GoalLeader } from '../types';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';
import { ResolveGoalLeadersUseCase } from './resolve-goal-leaders.use-case';

const TOP_STATS_LIMIT = 10;

@Injectable()
export class GetTopScorersUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly resolveGoalLeadersUseCase: ResolveGoalLeadersUseCase,
  ) {}

  async execute(tournamentId: string): Promise<GoalLeader[]> {
    await this.findTournamentOrThrowUseCase.execute(tournamentId);

    const topScorers = await this.tournamentsRepository.findTopScorers(
      tournamentId,
      TOP_STATS_LIMIT,
    );
    return this.resolveGoalLeadersUseCase.execute(topScorers);
  }
}
