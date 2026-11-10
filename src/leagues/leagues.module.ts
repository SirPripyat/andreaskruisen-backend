import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaguesController } from './leagues.controller';
import { LeaguesRepository } from './leagues.repository';
import { LeaguesService } from './leagues.service';

@Module({
  imports: [AuthModule],
  controllers: [LeaguesController],
  providers: [LeaguesService, LeaguesRepository],
  exports: [LeaguesRepository],
})
export class LeaguesModule {}
