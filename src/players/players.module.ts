import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlayersController } from './players.controller';
import { PlayersRepository } from './players.repository';
import { PlayersService } from './players.service';

@Module({
  imports: [AuthModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository],
})
export class PlayersModule {}
