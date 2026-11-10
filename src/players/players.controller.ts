import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { ListPlayersQuery, ListPlayersSchema } from './dto/list-players.schema';
import { PlayersService } from './players.service';

@Controller('players')
@UseGuards(SessionAuthGuard, AdminGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListPlayersSchema)) query: ListPlayersQuery,
  ) {
    return this.playersService.list(query);
  }
}
