import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { PrismaClient } from '../generated/prisma/client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './commons/config/env.schema';
import { FavoritesModule } from './favorites/favorites.module';
import { ImportModule } from './import/import.module';
import { LeaguesModule } from './leagues/leagues.module';
import { MatchesModule } from './matches/matches.module';
import { MeModule } from './me/me.module';
import { NationalitiesModule } from './nationalities/nationalities.module';
import { PlayersModule } from './players/players.module';
import { PrismaModule, PrismaService } from './prisma';
import { SeasonsModule } from './seasons/seasons.module';
import { SquadsModule } from './squads/squads.module';
import { StorageModule } from './storage/storage.module';
import { TeamsModule } from './teams/teams.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma<PrismaClient>({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    }),
    UsersModule,
    AuthModule,
    SeasonsModule,
    SquadsModule,
    FavoritesModule,
    PlayersModule,
    TeamsModule,
    TournamentsModule,
    MatchesModule,
    TransfersModule,
    LeaguesModule,
    NationalitiesModule,
    ImportModule,
    StorageModule,
    MeModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
