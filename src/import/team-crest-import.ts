import { PrismaClient } from '../../generated/prisma/client';
import { processInBatches } from './player-import';
import type { ScraperTeamCrest } from './scraper-team-crest.schema';

export const IMPORT_CREST_BATCH_SIZE = 25;

// A base hoje só tem times masculinos (ver comentário em Team.crestUrl no
// schema); entradas femininas do catálogo são puladas em vez de rejeitadas,
// já que o nome pode colidir com o time masculino homônimo (ex.: "Manchester
// Utd" feminino x "Manchester United" masculino).
const MASCULINE_GENDER = 'Futebol Masculino';

export interface TeamCrestImportSummary {
  processed: number;
  updated: number;
  skippedFeminino: number;
  // Nomes do JSON que não bateram com nenhum Team por nome — time ainda não
  // importado via players, ou nome abreviado/diferente entre os dois
  // catálogos da EA (ex.: "Man Utd" no de times x "Manchester United" no de
  // jogadores).
  notFound: string[];
  // Nomes do JSON que bateram com mais de um Team (nome repetido entre
  // países, ex.: "Nacional") e cuja liga informada no JSON também não
  // desempatou pra exatamente um Team.
  ambiguous: string[];
}

export async function importTeamCrests(
  prisma: PrismaClient,
  rows: ScraperTeamCrest[],
): Promise<TeamCrestImportSummary> {
  let updated = 0;
  let skippedFeminino = 0;
  const notFound: string[] = [];
  const ambiguous: string[] = [];

  await processInBatches(rows, IMPORT_CREST_BATCH_SIZE, async (row) => {
    if (row.gender !== MASCULINE_GENDER) {
      skippedFeminino++;
      return;
    }

    // Casa só pelo nome primeiro: quando é globalmente único no banco, dá
    // pra confiar nele mesmo que a liga do catálogo de times divirja da do
    // catálogo de jogadores (ex.: Anderlecht é "1A Pro League" num e
    // "Jupiler Pro League" no outro — nome comercial diferente da mesma
    // liga, não um erro de grafia). A liga só entra pra desempatar nome
    // repetido entre países (ex.: "Nacional"), com mode insensitive porque
    // aí sim os dois catálogos só divergem em capitalização.
    let teams = await prisma.team.findMany({
      where: { name: row.name },
      select: { id: true },
    });

    if (teams.length > 1) {
      teams = await prisma.team.findMany({
        where: {
          name: row.name,
          league: { name: { in: row.leagues, mode: 'insensitive' } },
        },
        select: { id: true },
      });
    }

    if (teams.length === 0) {
      // Nome abreviado do catálogo de times que não existe como Team.name
      // (ex.: "PSG" pro Paris Saint-Germain) — ver TeamAlias, curado
      // manualmente a partir dos notFound de cada rodada.
      const alias = await prisma.teamAlias.findUnique({
        where: { alias: row.name },
        select: { teamId: true },
      });
      if (!alias) {
        notFound.push(row.name);
        return;
      }
      await prisma.team.update({
        where: { id: alias.teamId },
        data: { crestUrl: row.logo },
      });
      updated++;
      return;
    }
    if (teams.length > 1) {
      ambiguous.push(row.name);
      return;
    }

    await prisma.team.update({
      where: { id: teams[0].id },
      data: { crestUrl: row.logo },
    });
    updated++;
  });

  return {
    processed: rows.length,
    updated,
    skippedFeminino,
    notFound,
    ambiguous,
  };
}
