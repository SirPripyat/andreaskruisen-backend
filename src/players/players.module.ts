import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { PlayersController } from './players.controller';
import { PlayersRepository } from './players.repository';
import { PlayersService } from './players.service';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository],
  exports: [PlayersRepository],
})
export class PlayersModule {}
