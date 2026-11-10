import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  ListMatchesQuery,
  ListMatchesSchema,
  ReplaceMatchGoals,
  ReplaceMatchGoalsSchema,
} from './dto';
import {
  GetMatchDetailUseCase,
  ListTournamentMatchesUseCase,
  ReplaceMatchGoalsUseCase,
  SimulateMatchUseCase,
} from './use-cases';

@Controller('matches')
@UseGuards(SessionAuthGuard)
export class MatchesController {
  constructor(
    private readonly listTournamentMatchesUseCase: ListTournamentMatchesUseCase,
    private readonly getMatchDetailUseCase: GetMatchDetailUseCase,
    private readonly replaceMatchGoalsUseCase: ReplaceMatchGoalsUseCase,
    private readonly simulateMatchUseCase: SimulateMatchUseCase,
  ) {}

  @Get()
  getMatches(
    @Query(new ZodValidationPipe(ListMatchesSchema)) query: ListMatchesQuery,
  ) {
    return this.listTournamentMatchesUseCase.execute(query);
  }

  @Get(':matchId')
  getMatchDetail(@Param('matchId') matchId: string) {
    return this.getMatchDetailUseCase.execute(matchId);
  }

  @Put(':matchId/goals')
  replaceMatchGoals(
    @Param('matchId') matchId: string,
    @Body(new ZodValidationPipe(ReplaceMatchGoalsSchema))
    dto: ReplaceMatchGoals,
  ) {
    return this.replaceMatchGoalsUseCase.execute(matchId, dto);
  }

  @Post(':matchId/simulate')
  simulateMatch(@Param('matchId') matchId: string) {
    return this.simulateMatchUseCase.execute(matchId);
  }
}
