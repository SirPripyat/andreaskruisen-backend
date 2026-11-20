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
import { UserRole } from '../../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import {
  AssignSquadRequestDTO,
  AssignSquadSchema,
  ChangeSquadFormationRequestDTO,
  ChangeSquadFormationSchema,
  ChooseSquadRequestDTO,
  ChooseSquadSchema,
  SetLineupStarterRequestDTO,
  SetLineupStarterSchema,
  SwapLineupStarterRequestDTO,
  SwapLineupStarterSchema,
} from './dto';
import { SquadsFacade } from './squads.facade';

@Controller('squads')
export class SquadsController {
  constructor(private readonly facade: SquadsFacade) {}

  @Get()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listForSeason(@Req() request: RequiredSeasonScopedRequest) {
    return this.facade.listForSeason(request.seasonId);
  }

  @Post()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  choose(
    @Req() request: RequiredSeasonScopedRequest,
    @Body(new ZodValidationPipe(ChooseSquadSchema))
    dto: ChooseSquadRequestDTO,
  ) {
    return this.facade.choose(request.user.id, request.seasonId, dto);
  }

  @Get('/me')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getMine(@Req() request: RequiredSeasonScopedRequest) {
    return this.facade.getMine(request.user.id, request.seasonId);
  }

  @Get('/:teamId/players')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  listRoster(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.facade.listRoster(request.seasonId, teamId);
  }

  @Get('/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getLineup(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.facade.getLineup(request.seasonId, teamId);
  }

  @Patch('/:teamId/lineup')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  swapLineupStarter(
    @Req() request: RequiredSeasonScopedRequest,
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
    @Req() request: RequiredSeasonScopedRequest,
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

  // Precisa vir depois de '/:teamId/lineup/formation' pro Nest não casar
  // "formation" como se fosse o :playerId dessa rota.
  @Patch('/:teamId/lineup/:playerId')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  setLineupStarter(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('teamId') teamId: string,
    @Param('playerId') playerId: string,
    @Body(new ZodValidationPipe(SetLineupStarterSchema))
    dto: SetLineupStarterRequestDTO,
  ) {
    return this.facade.setLineupStarter(
      request.seasonId,
      request.user,
      teamId,
      playerId,
      dto,
    );
  }

  @Post('/:seasonId/squads/assign')
  @Roles(UserRole.ADMIN)
  @UseGuards(SessionAuthGuard, RolesGuard)
  assign(
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(AssignSquadSchema))
    dto: AssignSquadRequestDTO,
  ) {
    return this.facade.assign(seasonId, dto);
  }
}
