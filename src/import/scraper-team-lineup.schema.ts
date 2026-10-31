import { z } from 'zod';
import { FORMATION_DISPLAY_TO_ENUM } from './formation-mapper';
import { LINEUP_POSITION_TO_ENUM } from './lineup-position-mapper';

const KNOWN_FORMATIONS = Object.keys(FORMATION_DISPLAY_TO_ENUM) as [
  string,
  ...string[],
];
const KNOWN_LINEUP_POSITIONS = Object.keys(LINEUP_POSITION_TO_ENUM) as [
  string,
  ...string[],
];

// player_id é o id do jogador no SoFIFA/EA, igual ao Player.eaId gravado na
// importação de jogadores — é o que usamos pra casar o titular com o
// Player, nunca o nome. team/short_name/league/sofifa_id e o campo
// "alternatives" vêm no JSON do scraper mas não têm uso no domínio: o zod
// os ignora por não fazerem parte do schema abaixo.
const StartingXiSlotSchema = z.object({
  position: z.enum(KNOWN_LINEUP_POSITIONS),
  player: z.string().min(1),
  overall: z.number().int(),
  player_id: z.number().int(),
});

export const ScraperTeamLineupSchema = z.object({
  team: z.string().min(1),
  short_name: z.string().min(1),
  formation: z.enum(KNOWN_FORMATIONS),
  starting_xi: z.array(StartingXiSlotSchema).min(1),
});

export const ScraperTeamLineupsFileSchema = z.object({
  teams: z.array(ScraperTeamLineupSchema),
});

export type ScraperTeamLineup = z.infer<typeof ScraperTeamLineupSchema>;
export type ScraperTeamLineupsFile = z.infer<
  typeof ScraperTeamLineupsFileSchema
>;
