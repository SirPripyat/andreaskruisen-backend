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
import {
  AuthenticatedRequest,
  SessionAuthGuard,
} from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { AssignSquad, AssignSquadSchema } from './dto/assign-squad.schema';
import { ChooseSquad, ChooseSquadSchema } from './dto/choose-squad.schema';
import { SquadsService } from './squads.service';

@Controller('seasons/:seasonId/squads')
@UseGuards(SessionAuthGuard)
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Get()
  listForSeason(@Param('seasonId') seasonId: string) {
    return this.squadsService.listForSeason(seasonId);
  }

  @Post()
  choose(
    @Req() request: AuthenticatedRequest,
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(ChooseSquadSchema)) dto: ChooseSquad,
  ) {
    return this.squadsService.choose(request.user.id, seasonId, dto);
  }

  @Post('assign')
  @UseGuards(SessionAuthGuard, AdminGuard)
  assign(
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(AssignSquadSchema)) dto: AssignSquad,
  ) {
    return this.squadsService.assign(seasonId, dto);
  }

  @Get('me')
  getMine(
    @Req() request: AuthenticatedRequest,
    @Param('seasonId') seasonId: string,
  ) {
    return this.squadsService.getMine(request.user.id, seasonId);
  }

  // Elenco inteiro da temporada, agrupado por setor (goleiros, defensores,
  // meio-campistas, atacantes), cada jogador com isStarter (titular do time
  // real no SoFIFA, ver TeamLineupSlot) — ver SquadsRepository.groupBySector.
  @Get(':teamId/players')
  listRoster(
    @Param('seasonId') seasonId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.squadsService.listRoster(seasonId, teamId);
  }

  // Formação + titulares/banco (SoFIFA) desse time nessa temporada — ver
  // SquadsRepository.findLineupOverview pra como isso convive com trocas.
  @Get(':teamId/lineup')
  getLineup(
    @Param('seasonId') seasonId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.squadsService.getLineup(seasonId, teamId);
  }
}
