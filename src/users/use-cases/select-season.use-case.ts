import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '../../../generated/prisma/client';
import { UsersRepository } from '../users.repository';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class SelectSeasonUseCase {
  constructor(private readonly repository: UsersRepository) {}

  async execute(
    userId: string,
    seasonId: string,
  ): Promise<Pick<User, 'id' | 'name' | 'role' | 'selectedSeasonId'>> {
    try {
      return await this.repository.updateSelectedSeason(userId, seasonId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new NotFoundException('Temporada não encontrada');
      }
      throw error;
    }
  }
}
