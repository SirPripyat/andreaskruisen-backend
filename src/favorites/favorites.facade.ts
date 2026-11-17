import { Injectable } from '@nestjs/common';
import { ListFavoritesResponseDTO } from './dto';
import {
  AddFavoriteUseCase,
  ListFavoritesUseCase,
  RemoveFavoriteUseCase,
} from './use-cases';

@Injectable()
export class FavoritesFacade {
  constructor(
    private readonly listFavoritesUseCase: ListFavoritesUseCase,
    private readonly addFavoriteUseCase: AddFavoriteUseCase,
    private readonly removeFavoriteUseCase: RemoveFavoriteUseCase,
  ) {}

  list(userId: string, seasonId: string): Promise<ListFavoritesResponseDTO> {
    return this.listFavoritesUseCase.execute(userId, seasonId);
  }

  add(userId: string, seasonId: string, playerId: string): Promise<void> {
    return this.addFavoriteUseCase.execute(userId, seasonId, playerId);
  }

  remove(userId: string, seasonId: string, playerId: string): Promise<void> {
    return this.removeFavoriteUseCase.execute(userId, seasonId, playerId);
  }
}
