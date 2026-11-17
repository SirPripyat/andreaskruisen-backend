import { Injectable } from '@nestjs/common';
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
  ) {}

  getMatches(query: ListMatchesRequestDTO): Promise<ListMatchesResponseDTO> {
    return this.listTournamentMatchesUseCase.execute(query);
  }

  getMatchDetail(matchId: string): Promise<GetMatchDetailResponseDTO> {
    return this.getMatchDetailUseCase.execute(matchId);
  }

  replaceMatchGoals(
    matchId: string,
    dto: ReplaceMatchGoalsRequestDTO,
  ): Promise<ReplaceMatchGoalsResponseDTO> {
    return this.replaceMatchGoalsUseCase.execute(matchId, dto);
  }

  simulateMatch(matchId: string): Promise<SimulateMatchResponseDTO> {
    return this.simulateMatchUseCase.execute(matchId);
  }
}
