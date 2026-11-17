import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesFacade } from './favorites.facade';
import { FavoritesRepository } from './favorites.repository';
import {
  AddFavoriteUseCase,
  ListFavoritesUseCase,
  RemoveFavoriteUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [FavoritesController],
  providers: [
    FavoritesRepository,
    FavoritesFacade,
    ListFavoritesUseCase,
    AddFavoriteUseCase,
    RemoveFavoriteUseCase,
  ],
})
export class FavoritesModule {}
