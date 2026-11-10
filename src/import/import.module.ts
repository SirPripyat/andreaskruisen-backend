import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { NationalitiesModule } from '../nationalities/nationalities.module';
import { PlayersModule } from '../players/players.module';
import { TeamsModule } from '../teams/teams.module';
import { ImportController } from './import.controller';
import { ImportPlayersUseCase } from './use-cases/import-players.use-case';
import { ImportTeamAliasesUseCase } from './use-cases/import-team-aliases.use-case';
import { ImportTeamCrestsUseCase } from './use-cases/import-team-crests.use-case';
import { ImportTeamFormationsUseCase } from './use-cases/import-team-formations.use-case';
import { ImportTeamLineupsUseCase } from './use-cases/import-team-lineups.use-case';

@Module({
  imports: [
    AuthModule,
    PlayersModule,
    TeamsModule,
    LeaguesModule,
    NationalitiesModule,
  ],
  controllers: [ImportController],
  providers: [
    ImportPlayersUseCase,
    ImportTeamFormationsUseCase,
    ImportTeamLineupsUseCase,
    ImportTeamCrestsUseCase,
    ImportTeamAliasesUseCase,
  ],
})
export class ImportModule {}
