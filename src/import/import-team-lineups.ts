import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { ScraperTeamLineupsFileSchema } from './scraper-team-lineup.schema';
import { importTeamLineups } from './team-lineup-import';

function parseArgs(argv: string[]): { filePath: string } {
  const filePath = argv[2];
  if (!filePath) {
    throw new Error('Uso: pnpm import:lineups <caminho-do-json>');
  }
  return { filePath };
}

async function main() {
  const { filePath } = parseArgs(process.argv);

  console.log(`Lendo ${filePath}...`);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log('Validando schema do scraper...');
  const { teams } = ScraperTeamLineupsFileSchema.parse(raw);
  console.log(`${teams.length} escalações validadas.`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const { processed, updated, notFound, playersNotFound, staleTeamSlots } =
      await importTeamLineups(prisma, teams);

    console.log(
      `Concluído: ${processed} times processados, ${updated} escalações atualizadas.`,
    );
    if (notFound.length > 0) {
      console.warn(
        `Não encontrados (${notFound.length}): ${notFound.join(', ')}`,
      );
    }
    if (playersNotFound > 0) {
      console.warn(
        `Titulares sem Player correspondente (eaId não encontrado): ${playersNotFound}`,
      );
    }
    if (staleTeamSlots > 0) {
      console.warn(
        `Titulares ignorados por estarem em outro time agora (provável transferência): ${staleTeamSlots}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
