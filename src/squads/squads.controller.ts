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
  AssignSquadRequestDTO,
  AssignSquadSchema,
  ChangeSquadFormationRequestDTO,
  ChangeSquadFormationSchema,
  ChooseSquadRequestDTO,
  ChooseSquadSchema,
  SwapLineupStarterRequestDTO,
  SwapLineupStarterSchema,
} from './dto';
import { SquadsFacade } from './squads.facade';

@Controller('squads')
export class SquadsController {
  constructor(private readonly facade: SquadsFacade) {}

  @Get()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listForSeason(@Req() request: SeasonScopedRequest) {
    return this.facade.listForSeason(request.seasonId);
  }

  @Post()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  choose(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(ChooseSquadSchema))
    dto: ChooseSquadRequestDTO,
  ) {
    return this.facade.choose(request.user.id, request.seasonId, dto);
  }

  @Get('/me')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getMine(@Req() request: SeasonScopedRequest) {
    return this.facade.getMine(request.user.id, request.seasonId);
  }

  @Get('/:teamId/players')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listRoster(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.facade.listRoster(request.seasonId, teamId);
  }

  @Get('/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getLineup(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.facade.getLineup(request.seasonId, teamId);
  }

  @Patch('/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  swapLineupStarter(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(SwapLineupStarterSchema))
    dto: SwapLineupStarterRequestDTO,
  ) {
    return this.facade.swapLineupStarter(
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
    dto: ChangeSquadFormationRequestDTO,
  ) {
    return this.facade.changeFormation(
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
    @Body(new ZodValidationPipe(AssignSquadSchema))
    dto: AssignSquadRequestDTO,
  ) {
    return this.facade.assign(seasonId, dto);
  }
}
