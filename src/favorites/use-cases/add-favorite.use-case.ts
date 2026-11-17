import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { FavoritesRepository } from '../favorites.repository';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class AddFavoriteUseCase {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  async execute(
    userId: string,
    seasonId: string,
    playerId: string,
  ): Promise<void> {
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
}
