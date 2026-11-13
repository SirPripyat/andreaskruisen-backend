import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { FavoritePlayer, PrismaClient } from '../../generated/prisma/client';
import { FavoritePlayerItem } from './types';

@Injectable()
export class FavoritesRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  // Idempotente de propósito: favoritar quem já tá na lista não deve ser
  // erro, é só um toggle (ver FavoritesService.add).
  add(
    userId: string,
    seasonId: string,
    playerId: string,
  ): Promise<FavoritePlayer> {
    return this.txHost.tx.favoritePlayer.upsert({
      where: { userId_seasonId_playerId: { userId, seasonId, playerId } },
      create: { userId, seasonId, playerId },
      update: {},
    });
  }

  async remove(
    userId: string,
    seasonId: string,
    playerId: string,
  ): Promise<boolean> {
    const { count } = await this.txHost.tx.favoritePlayer.deleteMany({
      where: { userId, seasonId, playerId },
    });
    return count > 0;
  }

  async findAllForUserSeason(
    userId: string,
    seasonId: string,
  ): Promise<FavoritePlayerItem[]> {
    const favorites = await this.txHost.tx.favoritePlayer.findMany({
      where: { userId, seasonId },
      orderBy: { createdAt: 'desc' },
      include: {
        player: { include: { team: true, nationality: true } },
      },
    });

    return favorites.map((favorite) => ({
      id: favorite.player.id,
      eaId: favorite.player.eaId,
      name: favorite.player.name,
      photoUrl: favorite.player.photoUrl,
      team: {
        id: favorite.player.team.id,
        name: favorite.player.team.name,
        crestUrl: favorite.player.team.crestUrl,
      },
      nationality: {
        id: favorite.player.nationality.id,
        name: favorite.player.nationality.name,
        flagUrl: favorite.player.nationality.flagUrl,
      },
      latestOverallRating: favorite.player.latestOverallRating,
      favoritedAt: favorite.createdAt,
    }));
  }
}
