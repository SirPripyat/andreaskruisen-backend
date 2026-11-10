import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TeamsRepository } from '../../teams/teams.repository';
import { IMPORT_FORMATION_BATCH_SIZE } from '../constants';
import { ScraperTeamFormation, ScraperTeamFormationSchema } from '../dto';
import { TeamFormationImportSummary } from '../types';
import {
  FORMATION_DISPLAY_TO_ENUM,
  parseJsonBuffer,
  processInBatches,
} from '../utils';

@Injectable()
export class ImportTeamFormationsUseCase {
  private readonly logger = new Logger(ImportTeamFormationsUseCase.name);

  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute(fileBuffer: Buffer): Promise<TeamFormationImportSummary> {
    const { rows, invalid } = this.parseRows(fileBuffer);
    const summary = await this.importFormations(rows);

    return { ...summary, invalid: [...invalid, ...summary.invalid] };
  }

  private parseRows(fileBuffer: Buffer): {
    rows: ScraperTeamFormation[];
    invalid: string[];
  } {
    const rawItems = parseJsonBuffer(
      fileBuffer,
      z.array(z.unknown()),
      'formações',
    );

    const rows: ScraperTeamFormation[] = [];
    const invalid: string[] = [];

    rawItems.forEach((item, index) => {
      const parsed = ScraperTeamFormationSchema.safeParse(item);

      if (parsed.success) {
        rows.push(parsed.data);
        return;
      }

      const reason = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      this.logger.warn(
        `Formação inválida no JSON (índice ${index}): ${reason}`,
      );

      invalid.push(`índice ${index}: ${reason}`);
    });

    return { rows, invalid };
  }

  private async importFormations(
    rows: ScraperTeamFormation[],
  ): Promise<TeamFormationImportSummary> {
    const startedAt = Date.now();
    const teamNames = Array.from(
      new Set(rows.map((row) => row.banco?.time ?? row.time)),
    );
    const teamIdsByName = await this.teamsRepository.findIdsByNames(teamNames);

    let updated = 0;
    const notFound: string[] = [];
    const ambiguous: string[] = [];

    await processInBatches(rows, IMPORT_FORMATION_BATCH_SIZE, async (row) => {
      const teamName = row.banco?.time ?? row.time;
      const teamIds = teamIdsByName.get(teamName) ?? [];

      if (teamIds.length === 0) {
        notFound.push(row.time);
        return;
      }

      if (teamIds.length > 1) {
        ambiguous.push(row.time);
        return;
      }

      try {
        await this.teamsRepository.update(teamIds[0], {
          formation: FORMATION_DISPLAY_TO_ENUM[row.formacao],
        });
        updated++;
      } catch (error) {
        this.logger.error(
          `Erro de infraestrutura atualizando formação do time "${row.time}": ${
            error instanceof Error ? error.message : 'erro desconhecido'
          }`,
        );
        throw error;
      }
    });

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Import de formações concluído: processed=${rows.length}, updated=${updated}, notFound=${notFound.length}, ambiguous=${ambiguous.length}, durationMs=${durationMs}`,
    );

    return {
      processed: rows.length,
      updated,
      notFound,
      ambiguous,
      invalid: [],
    };
  }
}
