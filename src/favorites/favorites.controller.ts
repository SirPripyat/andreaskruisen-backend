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
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@Req() request: SeasonScopedRequest) {
    return this.favoritesService.list(request.user.id, request.seasonId);
  }

  @Post(':playerId')
  @HttpCode(204)
  add(
    @Req() request: SeasonScopedRequest,
    @Param('playerId') playerId: string,
  ) {
    return this.favoritesService.add(
      request.user.id,
      request.seasonId,
      playerId,
    );
  }

  @Delete(':playerId')
  @HttpCode(204)
  remove(
    @Req() request: SeasonScopedRequest,
    @Param('playerId') playerId: string,
  ) {
    return this.favoritesService.remove(
      request.user.id,
      request.seasonId,
      playerId,
    );
  }
}
