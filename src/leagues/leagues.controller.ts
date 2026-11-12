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
import {
  FindLeagueResponseDTO,
  ListLeaguesRequestDTO,
  ListLeaguesResponseDTO,
  ListLeaguesSchema,
  UpdateLeagueRequestDTO,
  UpdateLeagueResponseDTO,
  UpdateLeagueSchema,
} from './dto';
import { LeaguesFacade } from './leagues.facade';

@Controller('leagues')
@UseGuards(SessionAuthGuard)
export class LeaguesController {
  constructor(private readonly facade: LeaguesFacade) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ListLeaguesSchema))
    query: ListLeaguesRequestDTO,
  ): Promise<ListLeaguesResponseDTO> {
    return this.facade.list(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  findOne(@Param('id') id: string): Promise<FindLeagueResponseDTO> {
    return this.facade.find(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLeagueSchema))
    dto: UpdateLeagueRequestDTO,
  ): Promise<UpdateLeagueResponseDTO> {
    return this.facade.update(id, dto);
  }
}
