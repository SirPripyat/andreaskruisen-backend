import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesRepository } from './favorites.repository';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesRepository],
})
export class FavoritesModule {}
