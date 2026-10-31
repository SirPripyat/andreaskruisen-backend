import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../../generated/prisma/client';
import { ScraperTeamFormationSchema } from './scraper-team-formation.schema';
import { importTeamFormations } from './team-formation-import';

function parseArgs(argv: string[]): { filePath: string } {
  const filePath = argv[2];
  if (!filePath) {
    throw new Error('Uso: pnpm import:formations <caminho-do-json>');
  }
  return { filePath };
}

async function main() {
  const { filePath } = parseArgs(process.argv);

  console.log(`Lendo ${filePath}...`);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log('Validando schema do scraper...');
  const rows = z.array(ScraperTeamFormationSchema).parse(raw);
  console.log(`${rows.length} formações validadas.`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const { processed, updated, notFound, ambiguous } =
      await importTeamFormations(prisma, rows);

    console.log(
      `Concluído: ${processed} times processados, ${updated} formações atualizadas.`,
    );
    if (notFound.length > 0) {
      console.warn(
        `Não encontrados (${notFound.length}): ${notFound.join(', ')}`,
      );
    }
    if (ambiguous.length > 0) {
      console.warn(
        `Ambíguos, mais de um Team com o mesmo nome (${ambiguous.length}): ${ambiguous.join(', ')}`,
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
