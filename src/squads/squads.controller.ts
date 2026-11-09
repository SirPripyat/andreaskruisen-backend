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
import { AssignSquad, AssignSquadSchema } from './dto/assign-squad.schema';
import { ChooseSquad, ChooseSquadSchema } from './dto/choose-squad.schema';
import { SquadsService } from './squads.service';

@Controller('squads')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Get()
  listForSeason(@Req() request: SeasonScopedRequest) {
    return this.squadsService.listForSeason(request.seasonId);
  }

  @Post()
  choose(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(ChooseSquadSchema)) dto: ChooseSquad,
  ) {
    return this.squadsService.choose(request.user.id, request.seasonId, dto);
  }

  @Get('me')
  getMine(@Req() request: SeasonScopedRequest) {
    return this.squadsService.getMine(request.user.id, request.seasonId);
  }

  // Elenco inteiro da temporada, agrupado por setor (goleiros, defensores,
  // meio-campistas, atacantes), cada jogador com isStarter (titular do time
  // real no SoFIFA, ver TeamLineupSlot) — ver SquadsRepository.groupBySector.
  @Get(':teamId/players')
  listRoster(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.squadsService.listRoster(request.seasonId, teamId);
  }

  // Formação + titulares/banco (SoFIFA) desse time nessa temporada — ver
  // SquadsRepository.findLineupOverview pra como isso convive com trocas.
  @Get(':teamId/lineup')
  getLineup(
    @Req() request: SeasonScopedRequest,
    @Param('teamId') teamId: string,
  ) {
    return this.squadsService.getLineup(request.seasonId, teamId);
  }
}

// Ação admin: vincula um usuário+time arbitrário a uma temporada específica
// (não necessariamente a que o admin tem selecionada) — por isso continua
// recebendo o seasonId explícito na URL, em vez de resolver via
// SeasonContextGuard.
@Controller('seasons/:seasonId/squads')
@UseGuards(SessionAuthGuard, AdminGuard)
export class SquadsAssignController {
  constructor(private readonly squadsService: SquadsService) {}

  @Post('assign')
  assign(
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(AssignSquadSchema)) dto: AssignSquad,
  ) {
    return this.squadsService.assign(seasonId, dto);
  }
}
