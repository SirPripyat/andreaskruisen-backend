import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TeamsRepository } from '../../teams/teams.repository';
import { TeamCrestDimension } from '../../teams/types';
import { IMPORT_CREST_BATCH_SIZE } from '../constants';
import { ScraperTeamCrest, ScraperTeamCrestSchema } from '../dto';
import { TeamCrestImportSummary } from '../types';
import { parseJsonBuffer, processInBatches } from '../utils';

// A base hoje só tem times masculinos (ver comentário em Team.crestUrl no
// schema); entradas femininas do catálogo são puladas em vez de rejeitadas,
// já que o nome pode colidir com o time masculino homônimo (ex.: "Manchester
// Utd" feminino x "Manchester United" masculino).
const MASCULINE_GENDER = 'Futebol Masculino';

@Injectable()
export class ImportTeamCrestsUseCase {
  private readonly logger = new Logger(ImportTeamCrestsUseCase.name);

  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute(fileBuffer: Buffer): Promise<TeamCrestImportSummary> {
    const { rows, invalid } = this.parseRows(fileBuffer);
    const summary = await this.importCrests(rows);

    return { ...summary, invalid: [...invalid, ...summary.invalid] };
  }

  private parseRows(fileBuffer: Buffer): {
    rows: ScraperTeamCrest[];
    invalid: string[];
  } {
    const rawItems = parseJsonBuffer(
      fileBuffer,
      z.array(z.unknown()),
      'escudos',
    );

    const rows: ScraperTeamCrest[] = [];
    const invalid: string[] = [];

    rawItems.forEach((item, index) => {
      const parsed = ScraperTeamCrestSchema.safeParse(item);
      if (parsed.success) {
        rows.push(parsed.data);
        return;
      }

      const reason = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      this.logger.warn(`Escudo inválido no JSON (índice ${index}): ${reason}`);
      invalid.push(`índice ${index}: ${reason}`);
    });

    return { rows, invalid };
  }

  private async importCrests(
    rows: ScraperTeamCrest[],
  ): Promise<TeamCrestImportSummary> {
    const startedAt = Date.now();
    const masculineRows = rows.filter((row) => row.gender === MASCULINE_GENDER);
    const skippedFeminino = rows.length - masculineRows.length;
    const names = Array.from(new Set(masculineRows.map((row) => row.name)));

    const [dimensionsByName, teamIdByAlias] = await Promise.all([
      this.teamsRepository.findCrestDimensionsByNames(names),
      this.teamsRepository.findIdsByAliases(names),
    ]);

    let updated = 0;
    const notFound: string[] = [];
    const ambiguous: string[] = [];

    await processInBatches(
      masculineRows,
      IMPORT_CREST_BATCH_SIZE,
      async (row) => {
        const teamIds = this.resolveTeamIds(
          row,
          dimensionsByName,
          teamIdByAlias,
        );

        if (teamIds.length === 0) {
          notFound.push(row.name);
          return;
        }
        if (teamIds.length > 1) {
          ambiguous.push(row.name);
          return;
        }

        try {
          await this.teamsRepository.update(teamIds[0], {
            crestUrl: row.logo,
          });
          updated++;
        } catch (error) {
          this.logger.error(
            `Erro de infraestrutura atualizando escudo do time "${row.name}": ${
              error instanceof Error ? error.message : 'erro desconhecido'
            }`,
          );
          throw error;
        }
      },
    );

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Import de escudos concluído: processed=${rows.length}, updated=${updated}, skippedFeminino=${skippedFeminino}, notFound=${notFound.length}, ambiguous=${ambiguous.length}, durationMs=${durationMs}`,
    );

    return {
      processed: rows.length,
      updated,
      skippedFeminino,
      notFound,
      ambiguous,
      invalid: [],
    };
  }

  // Casa só pelo nome primeiro: quando é globalmente único no banco, dá pra
  // confiar nele mesmo que a liga do catálogo de times divirja da do
  // catálogo de jogadores (ex.: Anderlecht é "1A Pro League" num e "Jupiler
  // Pro League" no outro — nome comercial diferente da mesma liga, não um
  // erro de grafia). A liga só entra pra desempatar nome repetido entre
  // países (ex.: "Nacional"), comparada sem diferenciar maiúsculas/minúsculas
  // porque aí sim os dois catálogos só divergem em capitalização. Quando o
  // nome não bate com nenhum Team, cai pro TeamAlias (nome abreviado do
  // catálogo de escudos curado manualmente, ex.: "PSG").
  private resolveTeamIds(
    row: ScraperTeamCrest,
    dimensionsByName: Map<string, TeamCrestDimension[]>,
    teamIdByAlias: Map<string, string>,
  ): string[] {
    let teams = dimensionsByName.get(row.name) ?? [];
    if (teams.length > 1) {
      const leagues = new Set(
        row.leagues.map((league) => league.toLowerCase()),
      );
      teams = teams.filter((team) =>
        leagues.has(team.leagueName.toLowerCase()),
      );
    }

    if (teams.length === 0) {
      const aliasTeamId = teamIdByAlias.get(row.name);
      return aliasTeamId ? [aliasTeamId] : [];
    }

    return teams.map((team) => team.id);
  }
}
