import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { PlayersController } from './players.controller';
import { PlayersFacade } from './players.facade';
import { PlayersRepository } from './players.repository';
import {
  GetPlayerUseCase,
  GetSimilarPlayersUseCase,
  ListPlayersForSeasonUseCase,
  ListPlayersUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [PlayersController],
  providers: [
    PlayersFacade,
    PlayersRepository,
    ListPlayersUseCase,
    ListPlayersForSeasonUseCase,
    GetPlayerUseCase,
    GetSimilarPlayersUseCase,
  ],
  exports: [PlayersRepository],
})
export class PlayersModule {}
