import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { ListTeamsQuery, ListTeamsSchema } from './dto/list-teams.schema';
import { UpdateTeam, UpdateTeamSchema } from './dto/update-team.schema';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(SessionAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Query(new ZodValidationPipe(ListTeamsSchema)) query: ListTeamsQuery,
  ) {
    return this.teamsService.list(query);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.teamsService.getOne(id);
  }

  @Get(':id/titles')
  async getTitles(@Param('id') id: string) {
    return this.teamsService.getTitles(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) dto: UpdateTeam,
  ) {
    return this.teamsService.update(id, dto);
  }
}
