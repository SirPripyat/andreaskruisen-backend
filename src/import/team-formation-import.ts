import { PrismaClient } from '../../generated/prisma/client';
import { FORMATION_DISPLAY_TO_ENUM } from './formation-mapper';
import { processInBatches } from './player-import';
import type { ScraperTeamFormation } from './scraper-team-formation.schema';

export const IMPORT_FORMATION_BATCH_SIZE = 25;

export interface TeamFormationImportSummary {
  processed: number;
  updated: number;
  // Nomes do JSON que não bateram com nenhum Team.name (ex.: time ainda não
  // importado via players, ou grafia diferente entre os dois JSONs do scraper).
  notFound: string[];
  // Nomes do JSON que bateram com mais de um Team (Team.name não é único —
  // ver comentário no schema). Precisa de intervenção manual pra desambiguar.
  ambiguous: string[];
}

export async function importTeamFormations(
  prisma: PrismaClient,
  rows: ScraperTeamFormation[],
): Promise<TeamFormationImportSummary> {
  let updated = 0;
  const notFound: string[] = [];
  const ambiguous: string[] = [];

  await processInBatches(rows, IMPORT_FORMATION_BATCH_SIZE, async (row) => {
    const formation = FORMATION_DISPLAY_TO_ENUM[row.formacao];
    const teamName = row.banco?.time ?? row.time;
    const teams = await prisma.team.findMany({
      where: { name: teamName },
      select: { id: true },
    });

    if (teams.length === 0) {
      notFound.push(row.time);
      return;
    }
    if (teams.length > 1) {
      ambiguous.push(row.time);
      return;
    }

    await prisma.team.update({
      where: { id: teams[0].id },
      data: { formation },
    });
    updated++;
  });

  return { processed: rows.length, updated, notFound, ambiguous };
}
