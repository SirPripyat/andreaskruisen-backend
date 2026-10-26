import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { ListTeamsQuery, ListTeamsSchema } from './dto/list-teams.schema';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(SessionAuthGuard, AdminGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListTeamsSchema)) query: ListTeamsQuery,
  ) {
    return this.teamsService.list(query);
  }
}
