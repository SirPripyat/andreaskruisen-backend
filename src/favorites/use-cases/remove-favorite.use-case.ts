import { Injectable, NotFoundException } from '@nestjs/common';
import { FavoritesRepository } from '../favorites.repository';

@Injectable()
export class RemoveFavoriteUseCase {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  async execute(
    userId: string,
    seasonId: string,
    playerId: string,
  ): Promise<void> {
    const removed = await this.favoritesRepository.remove(
      userId,
      seasonId,
      playerId,
    );
    if (!removed) {
      throw new NotFoundException(
        'Jogador não está na lista de favoritos dessa temporada',
      );
    }
  }
}
