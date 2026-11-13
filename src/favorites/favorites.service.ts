import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { FavoritesRepository } from './favorites.repository';
import { FavoritePlayerItem } from './types';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class FavoritesService {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  async add(userId: string, seasonId: string, playerId: string): Promise<void> {
    try {
      await this.favoritesRepository.add(userId, seasonId, playerId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException('Jogador não encontrado');
      }
      throw error;
    }
  }

  async remove(
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

  list(userId: string, seasonId: string): Promise<FavoritePlayerItem[]> {
    return this.favoritesRepository.findAllForUserSeason(userId, seasonId);
  }
}
