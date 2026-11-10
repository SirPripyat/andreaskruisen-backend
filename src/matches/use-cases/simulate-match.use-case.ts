import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { PhaseType } from 'generated/prisma/client';
import { MatchPenalties } from '../../tournaments/types';
import { MatchesRepository } from '../matches.repository';
import {
  MatchDetailResponse,
  SimulatedMatchResult,
  SimulationRosterPlayer,
} from '../types';
import { simulateMatch } from '../utils';
import { simulatePenaltyShootout } from '../utils/simulate-penalties.utils';
import { GetMatchDetailUseCase } from './get-match-detail.use-case';

@Injectable()
export class SimulateMatchUseCase {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly getMatchDetailUseCase: GetMatchDetailUseCase,
  ) {}

  @Transactional()
  async execute(matchId: string): Promise<MatchDetailResponse> {
    const match = await this.matchesRepository.findMatchForGoals(matchId);

    if (!match) throw new NotFoundException('Partida não encontrada');

    if (match.playedAt)
      throw new ConflictException('Partida já tem resultado registrado');

    const roster = await this.matchesRepository.findPlayersForSimulation(
      match.seasonId,
      [match.homeTeamId, match.awayTeamId],
    );

    const homeRoster = roster.filter((p) => p.teamId === match.homeTeamId);
    const awayRoster = roster.filter((p) => p.teamId === match.awayTeamId);

    if (homeRoster.length === 0 || awayRoster.length === 0)
      throw new BadRequestException(
        'Um dos times não tem jogadores cadastrados pra simular',
      );

    const result = simulateMatch(homeRoster, awayRoster);

    const penalties = this.resolveSimulatedPenalties(
      match.phaseType,
      result,
      homeRoster,
      awayRoster,
      match.homeTeamId,
      match.awayTeamId,
    );

    await this.matchesRepository.replaceMatchGoals(
      matchId,
      [
        ...result.homeGoals.map((goal) => ({
          ...goal,
          teamId: match.homeTeamId,
        })),
        ...result.awayGoals.map((goal) => ({
          ...goal,
          teamId: match.awayTeamId,
        })),
      ],
      penalties,
    );

    return this.getMatchDetailUseCase.execute(matchId);
  }

  private resolveSimulatedPenalties(
    phaseType: PhaseType,
    result: SimulatedMatchResult,
    homeRoster: SimulationRosterPlayer[],
    awayRoster: SimulationRosterPlayer[],
    homeTeamId: string,
    awayTeamId: string,
  ): MatchPenalties | null {
    const isDrawInKnockout =
      phaseType === 'KNOCKOUT' &&
      result.homeGoals.length === result.awayGoals.length;

    if (!isDrawInKnockout) return null;

    const shootout = simulatePenaltyShootout(homeRoster, awayRoster);

    return {
      homeScore: shootout.homeScore,
      awayScore: shootout.awayScore,
      winnerTeamId: shootout.homeWon ? homeTeamId : awayTeamId,
    };
  }
}
