import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClsService } from 'nestjs-cls';
import {
  flushPendingTournamentPrizeEvents,
  TOURNAMENT_PRIZE_AWARDED_EVENT,
} from '../notifications/events';
import {
  GetMatchDetailResponseDTO,
  ListMatchesRequestDTO,
  ListMatchesResponseDTO,
  ReplaceMatchGoalsRequestDTO,
  ReplaceMatchGoalsResponseDTO,
  SimulateMatchResponseDTO,
} from './dto';
import {
  GetMatchDetailUseCase,
  ListTournamentMatchesUseCase,
  ReplaceMatchGoalsUseCase,
  SimulateMatchUseCase,
} from './use-cases';

@Injectable()
export class MatchesFacade {
  constructor(
    private readonly listTournamentMatchesUseCase: ListTournamentMatchesUseCase,
    private readonly getMatchDetailUseCase: GetMatchDetailUseCase,
    private readonly replaceMatchGoalsUseCase: ReplaceMatchGoalsUseCase,
    private readonly simulateMatchUseCase: SimulateMatchUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly cls: ClsService,
  ) {}

  getMatches(query: ListMatchesRequestDTO): Promise<ListMatchesResponseDTO> {
    return this.listTournamentMatchesUseCase.execute(query);
  }

  getMatchDetail(matchId: string): Promise<GetMatchDetailResponseDTO> {
    return this.getMatchDetailUseCase.execute(matchId);
  }

  async replaceMatchGoals(
    matchId: string,
    dto: ReplaceMatchGoalsRequestDTO,
  ): Promise<ReplaceMatchGoalsResponseDTO> {
    const result = await this.replaceMatchGoalsUseCase.execute(matchId, dto);

    for (const event of flushPendingTournamentPrizeEvents(this.cls))
      this.eventEmitter.emit(TOURNAMENT_PRIZE_AWARDED_EVENT, event);

    return result;
  }

  simulateMatch(matchId: string): Promise<SimulateMatchResponseDTO> {
    return this.simulateMatchUseCase.execute(matchId);
  }
}
