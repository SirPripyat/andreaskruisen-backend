import { Module } from '@nestjs/common';
import { RulesetsRepository } from './rulesets.repository';
import {
  GetActiveRulesetUseCase,
  SeedDefaultRulesetUseCase,
} from './use-cases';

@Module({
  providers: [
    RulesetsRepository,
    GetActiveRulesetUseCase,
    SeedDefaultRulesetUseCase,
  ],
  exports: [
    RulesetsRepository,
    GetActiveRulesetUseCase,
    SeedDefaultRulesetUseCase,
  ],
})
export class RulesetsModule {}
