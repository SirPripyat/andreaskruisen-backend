import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  ChangeSquadFormation,
  ChangeSquadFormationSchema,
  ChooseSquad,
  ChooseSquadSchema,
  SwapLineupStarter,
  SwapLineupStarterSchema,
} from './dto';
import {
  AssignSquadUseCase,
  ChangeSquadFormationUseCase,
  ChooseSquadUseCase,
  GetMySquadUseCase,
  GetSquadLineupUseCase,
  ListSquadRosterUseCase,
  ListSquadsUseCase,
  SwapLineupStarterUseCase,
} from './use-cases';

@Controller('squads')
export class SquadsController {
  constructor(
    private readonly listSquadsUseCase: ListSquadsUseCase,
    private readonly chooseSquadUseCase: ChooseSquadUseCase,
    private readonly assignSquadUseCase: AssignSquadUseCase,
    private readonly listSquadRosterUseCase: ListSquadRosterUseCase,
    private readonly getSquadLineupUseCase: GetSquadLineupUseCase,
    private readonly getMySquadUseCase: GetMySquadUseCase,
    private readonly swapLineupStarterUseCase: SwapLineupStarterUseCase,
    private readonly changeSquadFormationUseCase: ChangeSquadFormationUseCase,
  ) {}

  @Get()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listForSeason(@Req() request: SeasonScopedRequest) {
    return this.listSquadsUseCase.execute(request.seasonId);
  }

  @Post()
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

  @Get('/me')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getMine(@Req() request: SeasonScopedRequest) {
    return this.getMySquadUseCase.execute(request.user.id, request.seasonId);
  }

  @Get('/:teamId/players')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listRoster(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.listSquadRosterUseCase.execute(request.seasonId, teamId);
  }

  @Get('/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getLineup(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.getSquadLineupUseCase.execute(request.seasonId, teamId);
  }

  @Patch('/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  swapLineupStarter(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(SwapLineupStarterSchema))
    dto: SwapLineupStarter,
  ) {
    return this.swapLineupStarterUseCase.execute(
      request.seasonId,
      request.user,
      teamId,
      dto,
    );
  }

  @Patch('/:teamId/lineup/formation')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  changeFormation(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(ChangeSquadFormationSchema))
    dto: ChangeSquadFormation,
  ) {
    return this.changeSquadFormationUseCase.execute(
      request.seasonId,
      request.user,
      teamId,
      dto,
    );
  }

  @Post('/:seasonId/squads/assign')
  @UseGuards(SessionAuthGuard, AdminGuard)
  assign(
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(AssignSquadSchema)) dto: AssignSquad,
  ) {
    return this.assignSquadUseCase.execute(seasonId, dto);
  }
}
