import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import {
  AssignSquad,
  AssignSquadSchema,
  ChooseSquad,
  ChooseSquadSchema,
} from './dto';
import {
  AssignSquadUseCase,
  ChooseSquadUseCase,
  GetMySquadUseCase,
  GetSquadLineupUseCase,
  ListSquadRosterUseCase,
  ListSquadsUseCase,
} from './use-cases';

@Controller()
export class SquadsController {
  constructor(
    private readonly listSquadsUseCase: ListSquadsUseCase,
    private readonly chooseSquadUseCase: ChooseSquadUseCase,
    private readonly assignSquadUseCase: AssignSquadUseCase,
    private readonly listSquadRosterUseCase: ListSquadRosterUseCase,
    private readonly getSquadLineupUseCase: GetSquadLineupUseCase,
    private readonly getMySquadUseCase: GetMySquadUseCase,
  ) {}

  @Get('squads')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listForSeason(@Req() request: SeasonScopedRequest) {
    return this.listSquadsUseCase.execute(request.seasonId);
  }

  @Post('squads')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  choose(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(ChooseSquadSchema)) dto: ChooseSquad,
  ) {
    return this.chooseSquadUseCase.execute(
      request.user.id,
      request.seasonId,
      dto,
    );
  }

  @Get('squads/me')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getMine(@Req() request: SeasonScopedRequest) {
    return this.getMySquadUseCase.execute(request.user.id, request.seasonId);
  }

  @Get('squads/:teamId/players')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listRoster(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.listSquadRosterUseCase.execute(request.seasonId, teamId);
  }

  @Get('squads/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getLineup(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.getSquadLineupUseCase.execute(request.seasonId, teamId);
  }

  @Post('seasons/:seasonId/squads/assign')
  @UseGuards(SessionAuthGuard, AdminGuard)
  assign(
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(AssignSquadSchema)) dto: AssignSquad,
  ) {
    return this.assignSquadUseCase.execute(seasonId, dto);
  }
}
