import { PrismaClient } from '../../generated/prisma/client';
import { processInBatches } from './player-import';
import type { TeamAliasResolutionEntry } from './scraper-team-alias-resolution.schema';

export const IMPORT_ALIAS_BATCH_SIZE = 25;

export interface TeamAliasImportSummary {
  processed: number;
  created: number;
  // Entradas sem resolved_team_name preenchido: nada a fazer, não é erro.
  skipped: number;
  // resolved_team_name preenchido mas sem Team com esse nome exato.
  teamNotFound: string[];
  // resolved_team_name bate com mais de um Team (nome repetido entre
  // países) — precisa do nome completo ou de resolver na mão.
  ambiguous: string[];
}

export async function importTeamAliases(
  prisma: PrismaClient,
  entries: TeamAliasResolutionEntry[],
): Promise<TeamAliasImportSummary> {
  let created = 0;
  let skipped = 0;
  const teamNotFound: string[] = [];
  const ambiguous: string[] = [];

  await processInBatches(entries, IMPORT_ALIAS_BATCH_SIZE, async (entry) => {
    if (!entry.resolved_team_name) {
      skipped++;
      return;
    }

    const teams = await prisma.team.findMany({
      where: { name: entry.resolved_team_name },
      select: { id: true },
    });

    if (teams.length === 0) {
      teamNotFound.push(entry.json_name);
      return;
    }
    if (teams.length > 1) {
      ambiguous.push(entry.json_name);
      return;
    }

    // Upsert: reaplicar o mesmo arquivo depois (ex.: acrescentando mais
    // resolved_team_name) não deve falhar nos que já foram criados antes.
    await prisma.teamAlias.upsert({
      where: { alias: entry.json_name },
      create: { alias: entry.json_name, teamId: teams[0].id },
      update: { teamId: teams[0].id },
    });
    created++;
  });

  return {
    processed: entries.length,
    created,
    skipped,
    teamNotFound,
    ambiguous,
  };
}
