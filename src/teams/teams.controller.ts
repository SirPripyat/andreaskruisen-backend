import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
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
  ListTeamsRequestDTO,
  ListTeamsSchema,
  UpdateTeamRequestDTO,
  UpdateTeamSchema,
} from './dto';
import { TeamsFacade } from './teams.facade';

@Controller('teams')
@UseGuards(SessionAuthGuard)
export class TeamsController {
  constructor(private readonly facade: TeamsFacade) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListTeamsSchema)) query: ListTeamsRequestDTO,
  ) {
    return this.facade.list(query);
  }

  @Get(':id')
  @UseGuards(SeasonContextGuard)
  async getOne(
    @Param('id') id: string,
    @Req() request: RequiredSeasonScopedRequest,
  ) {
    return this.facade.getOne(id, request.seasonId);
  }

  @Get(':id/titles')
  async getTitles(@Param('id') id: string) {
    return this.facade.getTitles(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, SeasonContextGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) dto: UpdateTeamRequestDTO,
    @Req() request: RequiredSeasonScopedRequest,
  ) {
    return this.facade.update(id, dto, request.seasonId);
  }
}
