import { z } from 'zod';

// Catálogo oficial de times da EA (arquivo separado do de jogadores e do de
// escalações): usado só pra sobrescrever Team.crestUrl com uma imagem
// estável, já que o crestUrl vindo do SoFIFA (ver player-import.ts) varia de
// resolução entre execuções do scraper. id e region vêm no JSON mas não têm
// uso no domínio: o zod os ignora por não fazerem parte do schema abaixo.
export const ScraperTeamCrestSchema = z.object({
  name: z.string().min(1),
  logo: z.url(),
  gender: z.string().min(1),
  leagues: z.array(z.string().min(1)).min(1),
});

export type ScraperTeamCrest = z.infer<typeof ScraperTeamCrestSchema>;
