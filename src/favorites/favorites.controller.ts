import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import { FavoritesFacade } from './favorites.facade';

@Controller('favorites')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class FavoritesController {
  constructor(private readonly facade: FavoritesFacade) {}

  @Get()
  list(@Req() request: RequiredSeasonScopedRequest) {
    return this.facade.list(request.user.id, request.seasonId);
  }

  @Post(':playerId')
  @HttpCode(204)
  add(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('playerId') playerId: string,
  ) {
    return this.facade.add(request.user.id, request.seasonId, playerId);
  }

  @Delete(':playerId')
  @HttpCode(204)
  remove(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('playerId') playerId: string,
  ) {
    return this.facade.remove(request.user.id, request.seasonId, playerId);
  }
}
