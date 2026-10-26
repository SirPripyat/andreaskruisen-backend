import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  SessionAuthGuard,
} from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { ChooseSquad, ChooseSquadSchema } from './dto/choose-squad.schema';
import { SquadsService } from './squads.service';

@Controller('seasons/:seasonId/squads')
@UseGuards(SessionAuthGuard)
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Post()
  choose(
    @Req() request: AuthenticatedRequest,
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(ChooseSquadSchema)) dto: ChooseSquad,
  ) {
    return this.squadsService.choose(request.user.id, seasonId, dto);
  }

  @Get('me')
  getMine(
    @Req() request: AuthenticatedRequest,
    @Param('seasonId') seasonId: string,
  ) {
    return this.squadsService.getMine(request.user.id, seasonId);
  }
}
