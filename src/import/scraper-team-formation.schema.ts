import { z } from 'zod';
import { FORMATION_DISPLAY_TO_ENUM } from './formation-mapper';

const KNOWN_FORMATIONS = Object.keys(FORMATION_DISPLAY_TO_ENUM) as [
  string,
  ...string[],
];

// banco.time é o nome usado para bater com Team.name no banco quando o nome
// de exibição do scraper (time) não é igual ao nome cadastrado (ex.: alias
// abreviado). time vem null quando o scraper não achou correspondência
// (status "sem_correspondencia") — nesse caso o match cai pro `time` do topo.
const ScraperTeamFormationBancoSchema = z.object({
  time: z.string().min(1).nullable(),
  status: z.string().min(1),
});

export const ScraperTeamFormationSchema = z.object({
  time: z.string().min(1),
  formacao: z.enum(KNOWN_FORMATIONS),
  banco: ScraperTeamFormationBancoSchema.optional(),
});

export type ScraperTeamFormation = z.infer<typeof ScraperTeamFormationSchema>;
