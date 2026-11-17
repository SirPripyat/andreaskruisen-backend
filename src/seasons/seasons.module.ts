import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { SeasonContextGuard } from './season-context.guard';
import { SeasonsController } from './seasons.controller';
import { SeasonsFacade } from './seasons.facade';
import { SeasonsRepository } from './seasons.repository';
import {
  FindSeasonOrThrowUseCase,
  FindSeasonUseCase,
  GetActiveSeasonUseCase,
  GetEffectiveSeasonIdUseCase,
  ListSeasonsUseCase,
  RemoveSeasonUseCase,
  SelectActiveSeasonUseCase,
  StartSeasonEconomyUseCase,
  StartSeasonUseCase,
  UpdateSeasonUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, RulesetsModule],
  controllers: [SeasonsController],
  providers: [
    SeasonsRepository,
    SeasonsFacade,
    SeasonContextGuard,
    FindSeasonOrThrowUseCase,
    StartSeasonEconomyUseCase,
    StartSeasonUseCase,
    FindSeasonUseCase,
    UpdateSeasonUseCase,
    RemoveSeasonUseCase,
    ListSeasonsUseCase,
    GetActiveSeasonUseCase,
    SelectActiveSeasonUseCase,
    GetEffectiveSeasonIdUseCase,
  ],
  exports: [SeasonsRepository, SeasonContextGuard],
})
export class SeasonsModule {}
