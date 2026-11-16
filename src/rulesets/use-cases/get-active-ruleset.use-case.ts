import { Injectable, NotFoundException } from '@nestjs/common';
import { RulesetsRepository } from '../rulesets.repository';
import {
  RulesetPayload,
  RulesetPayloadSchema,
} from '../schemas/ruleset-payload.schema';

@Injectable()
export class GetActiveRulesetUseCase {
  constructor(private readonly rulesetsRepository: RulesetsRepository) {}

  async execute(
    seasonId: string,
    atTime = new Date(),
  ): Promise<RulesetPayload> {
    const ruleset = await this.rulesetsRepository.findActiveAt(
      seasonId,
      atTime,
    );

    if (!ruleset)
      throw new NotFoundException('Nenhum ruleset vigente para essa temporada');

    // Revalida sempre: o payload salvo pode ter nascido de uma versão
    // anterior do schema, nunca confiar no que está no banco sem reparsear.
    // O cast é só pro tipo estático: RulesetPayload corrige manualmente o
    // `maxOverallDiff` de transferPricing, que o z.infer dessa versão do
    // zod infere errado (ver comentário no schema) — a validação de
    // verdade já rodou no .parse acima.
    return RulesetPayloadSchema.parse(ruleset.payload) as RulesetPayload;
  }
}
