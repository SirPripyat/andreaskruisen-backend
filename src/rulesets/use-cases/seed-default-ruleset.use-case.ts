import { Injectable } from '@nestjs/common';
import { Ruleset } from '../../../generated/prisma/client';
import { DEFAULT_RULESET_PAYLOAD } from '../constants/default-ruleset-payload';
import { RulesetsRepository } from '../rulesets.repository';

const DEFAULT_VERSION = 1;

// Cria a version 1 do ruleset de uma season, com os valores atuais (ver
// DEFAULT_RULESET_PAYLOAD). Chamado só por SeasonsService.startEconomy,
// que já garante (via Season.economyStartedAt) que isso não roda duas
// vezes pra mesma season.
@Injectable()
export class SeedDefaultRulesetUseCase {
  constructor(private readonly rulesetsRepository: RulesetsRepository) {}

  execute(seasonId: string): Promise<Ruleset> {
    return this.rulesetsRepository.create({
      seasonId,
      version: DEFAULT_VERSION,
      payload: DEFAULT_RULESET_PAYLOAD,
    });
  }
}
