import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { PhaseType } from 'generated/prisma/client';
import { TournamentsRepository } from '../../tournaments/tournaments.repository';
import { ReplaceMatchGoalsRequestDTO } from '../dto/request';
import { MatchesRepository } from '../matches.repository';
import { Goal, MatchDetailResponse } from '../types';
import { countGoalsByTeam } from '../utils';
import { AwardMatchPrizesUseCase } from './award-match-prizes.use-case';
import { GetMatchDetailUseCase } from './get-match-detail.use-case';

@Injectable()
export class ReplaceMatchGoalsUseCase {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly getMatchDetailUseCase: GetMatchDetailUseCase,
    private readonly awardMatchPrizesUseCase: AwardMatchPrizesUseCase,
  ) {}

  @Transactional()
  async execute(
    matchId: string,
    dto: ReplaceMatchGoalsRequestDTO,
  ): Promise<MatchDetailResponse> {
    const match = await this.matchesRepository.findMatchForGoals(matchId);
    if (!match) throw new NotFoundException('Partida não encontrada');

    if (!match.awayTeamId)
      throw new ConflictException('Partida de bye não tem placar para editar');

    if (match.tournamentFinishedAt)
      throw new ConflictException(
        'Partida travada: o torneio já foi encerrado',
      );

    const locked = await this.tournamentsRepository.hasLaterPhase(
      match.tournamentId,
      match.phaseOrder,
    );

    if (locked)
      throw new ConflictException(
        'Partida travada: a fase seguinte já foi gerada a partir dela',
      );

    const playerIds = [
      ...new Set(
        dto.goals.flatMap((goal) =>
          goal.assistId ? [goal.scorerId, goal.assistId] : [goal.scorerId],
        ),
      ),
    ];

    const assignments =
      await this.matchesRepository.findAssignedTeamsByPlayerIds(
        match.seasonId,
        playerIds,
      );

    const teamIdByPlayerId = new Map(
      assignments.map((assignment) => [assignment.playerId, assignment.teamId]),
    );

    const matchTeamIds = new Set([match.homeTeamId, match.awayTeamId]);

    const goals: Goal[] = [];

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

      goals.push({
        scorerId: goal.scorerId,
        assistId: goal.assistId ?? null,
        teamId: scorerTeamId,
      });
    }

    const { homeGoals, awayGoals } = countGoalsByTeam(goals, match.homeTeamId);

    const penalties = this.resolveManualPenalties(
      match.phaseType,
      match.homeTeamId,
      match.awayTeamId,
      homeGoals,
      awayGoals,
      dto.penalties,
    );

    await this.matchesRepository.replaceMatchGoals(matchId, goals, penalties);

    await this.awardMatchPrizesUseCase.execute(
      match,
      homeGoals,
      awayGoals,
      penalties,
    );

    return this.getMatchDetailUseCase.execute(matchId);
  }

  private resolveManualPenalties(
    phaseType: PhaseType,
    homeTeamId: string,
    awayTeamId: string,
    homeGoals: number,
    awayGoals: number,
    dtoPenalties: ReplaceMatchGoalsRequestDTO['penalties'],
  ) {
    const isDrawInKnockout =
      phaseType === 'KNOCKOUT' && homeGoals === awayGoals;

    if (!isDrawInKnockout && dtoPenalties) {
      throw new BadRequestException(
        'Pênaltis só se aplicam a um empate em partida eliminatória',
      );
    }

    if (!isDrawInKnockout) return null;

    if (!dtoPenalties)
      throw new BadRequestException(
        'Partida eliminatória empatada precisa do resultado dos pênaltis',
      );

    return {
      homeScore: dtoPenalties.homeScore,
      awayScore: dtoPenalties.awayScore,
      winnerTeamId:
        dtoPenalties.homeScore > dtoPenalties.awayScore
          ? homeTeamId
          : awayTeamId,
    };
  }
}
