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
  ListMatchesRequestDTO,
  ListMatchesSchema,
  ReplaceMatchGoalsRequestDTO,
  ReplaceMatchGoalsSchema,
} from './dto';
import { MatchesFacade } from './matches.facade';

@Controller('matches')
@UseGuards(SessionAuthGuard)
export class MatchesController {
  constructor(private readonly facade: MatchesFacade) {}

  @Get()
  getMatches(
    @Query(new ZodValidationPipe(ListMatchesSchema))
    query: ListMatchesRequestDTO,
  ) {
    return this.facade.getMatches(query);
  }

  @Get(':matchId')
  getMatchDetail(@Param('matchId') matchId: string) {
    return this.facade.getMatchDetail(matchId);
  }

  @Put(':matchId/goals')
  replaceMatchGoals(
    @Param('matchId') matchId: string,
    @Body(new ZodValidationPipe(ReplaceMatchGoalsSchema))
    dto: ReplaceMatchGoalsRequestDTO,
  ) {
    return this.facade.replaceMatchGoals(matchId, dto);
  }

  @Post(':matchId/simulate')
  simulateMatch(@Param('matchId') matchId: string) {
    return this.facade.simulateMatch(matchId);
  }
}
