import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TeamsRepository } from '../../teams/teams.repository';
import { IMPORT_ALIAS_BATCH_SIZE } from '../constants';
import {
  TeamAliasResolutionEntry,
  TeamAliasResolutionEntrySchema,
} from '../dto';
import { TeamAliasImportSummary } from '../types';
import { parseJsonBuffer, processInBatches } from '../utils';

@Injectable()
export class ImportTeamAliasesUseCase {
  private readonly logger = new Logger(ImportTeamAliasesUseCase.name);

  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute(fileBuffer: Buffer): Promise<TeamAliasImportSummary> {
    const { rows, invalid } = this.parseRows(fileBuffer);
    const summary = await this.importAliases(rows);

    return { ...summary, invalid: [...invalid, ...summary.invalid] };
  }

  private parseRows(fileBuffer: Buffer): {
    rows: TeamAliasResolutionEntry[];
    invalid: string[];
  } {
    const { entries: rawItems } = parseJsonBuffer(
      fileBuffer,
      z.object({ entries: z.array(z.unknown()) }),
      'resolução de aliases',
    );

    const rows: TeamAliasResolutionEntry[] = [];
    const invalid: string[] = [];

    rawItems.forEach((item, index) => {
      const parsed = TeamAliasResolutionEntrySchema.safeParse(item);
      if (parsed.success) {
        rows.push(parsed.data);
        return;
      }

      const reason = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      this.logger.warn(
        `Entrada de alias inválida no JSON (índice ${index}): ${reason}`,
      );
      invalid.push(`índice ${index}: ${reason}`);
    });

    return { rows, invalid };
  }

  private async importAliases(
    rows: TeamAliasResolutionEntry[],
  ): Promise<TeamAliasImportSummary> {
    const startedAt = Date.now();
    const resolvedRows = rows.filter(
      (row): row is TeamAliasResolutionEntry & { resolved_team_name: string } =>
        Boolean(row.resolved_team_name),
    );
    const skipped = rows.length - resolvedRows.length;

    const teamNames = Array.from(
      new Set(resolvedRows.map((row) => row.resolved_team_name)),
    );
    const teamIdsByName = await this.teamsRepository.findIdsByNames(teamNames);

    let created = 0;
    const teamNotFound: string[] = [];
    const ambiguous: string[] = [];

    await processInBatches(
      resolvedRows,
      IMPORT_ALIAS_BATCH_SIZE,
      async (row) => {
        const teamIds = teamIdsByName.get(row.resolved_team_name) ?? [];

        if (teamIds.length === 0) {
          teamNotFound.push(row.json_name);
          return;
        }
        if (teamIds.length > 1) {
          ambiguous.push(row.json_name);
          return;
        }

        try {
          await this.teamsRepository.upsertAlias(row.json_name, teamIds[0]);
          created++;
        } catch (error) {
          this.logger.error(
            `Erro de infraestrutura criando alias "${row.json_name}": ${
              error instanceof Error ? error.message : 'erro desconhecido'
            }`,
          );
          throw error;
        }
      },
    );

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Import de aliases concluído: processed=${rows.length}, created=${created}, skipped=${skipped}, teamNotFound=${teamNotFound.length}, ambiguous=${ambiguous.length}, durationMs=${durationMs}`,
    );

    return {
      processed: rows.length,
      created,
      skipped,
      teamNotFound,
      ambiguous,
      invalid: [],
    };
  }
}
