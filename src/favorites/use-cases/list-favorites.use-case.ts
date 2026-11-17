import { Injectable } from '@nestjs/common';
import { ListFavoritesResponseDTO } from '../dto';
import { FavoritesRepository } from '../favorites.repository';

@Injectable()
export class ListFavoritesUseCase {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  execute(userId: string, seasonId: string): Promise<ListFavoritesResponseDTO> {
    return this.favoritesRepository.findAllForUserSeason(userId, seasonId);
  }
}
