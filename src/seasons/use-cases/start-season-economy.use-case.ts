import { ConflictException, Injectable } from '@nestjs/common';
import { Season } from '../../../generated/prisma/client';
import {
  GetActiveRulesetUseCase,
  SeedDefaultRulesetUseCase,
} from '../../rulesets/use-cases';
import { SeasonsRepository } from '../seasons.repository';
import { calculateInitialBalances } from '../utils/initial-balance.utils';
import { FindSeasonOrThrowUseCase } from './find-season-or-throw.use-case';

// Calcula e lança o saldo inicial de cada squad da temporada (ver
// docs/regras-temporada/saldo-inicial.md). Chamado só por
// StartSeasonUseCase, logo depois dos squads serem criados — não existe
// mais um passo separado pra isso, já que a season sempre nasce com
// todos os squads definidos. O guard de economyStartedAt fica como
// proteção mesmo assim: nada aqui pode rodar duas vezes pra uma mesma
// season.
@Injectable()
export class StartSeasonEconomyUseCase {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly findSeasonOrThrowUseCase: FindSeasonOrThrowUseCase,
    private readonly seedDefaultRulesetUseCase: SeedDefaultRulesetUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  async execute(id: string): Promise<Season> {
    const season = await this.findSeasonOrThrowUseCase.execute(id);

    if (season.economyStartedAt) {
      throw new ConflictException(
        'O saldo inicial dessa temporada já foi calculado',
      );
    }

    await this.seedDefaultRulesetUseCase.execute(id);
    const ruleset = await this.getActiveRulesetUseCase.execute(id);

    const squads =
      await this.seasonsRepository.findSquadsWithPlayerOveralls(id);
    const initialBalances = calculateInitialBalances(
      squads,
      ruleset.initialBalance.baseOverall,
      ruleset.transferPricing,
    );

    return this.seasonsRepository.recordInitialBalances(id, initialBalances);
  }
}
