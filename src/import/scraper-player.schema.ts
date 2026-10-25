import { z } from 'zod';

export const PositionCodeSchema = z.enum([
  'GOL',
  'ZAG',
  'LD',
  'LE',
  'VOL',
  'MC',
  'MD',
  'ME',
  'MEI',
  'PD',
  'PE',
  'ATA',
]);

export const ScraperStatsSchema = z.object({
  acceleration: z.number().int(),
  agility: z.number().int(),
  jumping: z.number().int(),
  stamina: z.number().int(),
  strength: z.number().int(),
  aggression: z.number().int(),
  balance: z.number().int(),
  ballControl: z.number().int(),
  composure: z.number().int(),
  crossing: z.number().int(),
  curve: z.number().int(),
  def: z.number().int(),
  defensiveAwareness: z.number().int(),
  dri: z.number().int(),
  dribbling: z.number().int(),
  finishing: z.number().int(),
  freeKickAccuracy: z.number().int(),
  gkDiving: z.number().int(),
  gkHandling: z.number().int(),
  gkKicking: z.number().int(),
  gkPositioning: z.number().int(),
  gkReflexes: z.number().int(),
  headingAccuracy: z.number().int(),
  interceptions: z.number().int(),
  longPassing: z.number().int(),
  longShots: z.number().int(),
  pac: z.number().int(),
  pas: z.number().int(),
  penalties: z.number().int(),
  phy: z.number().int(),
  positioning: z.number().int(),
  reactions: z.number().int(),
  sho: z.number().int(),
  shortPassing: z.number().int(),
  shotPower: z.number().int(),
  slidingTackle: z.number().int(),
  sprintSpeed: z.number().int(),
  standingTackle: z.number().int(),
  vision: z.number().int(),
  volleys: z.number().int(),
});

// Campos como rank, position (texto completo), cardShieldUrl, height e weight
// vêm no JSON do scraper mas não têm uso no domínio: o zod os ignora por não
// fazerem parte do schema abaixo.
export const ScraperPlayerSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  photoUrl: z.string().url(),
  team: z.string().min(1),
  teamCrestUrl: z.string().url(),
  nationality: z.string().min(1),
  nationalityFlagUrl: z.string().url(),
  league: z.string().min(1),
  birthdate: z.string().min(1),
  preferredFoot: z.enum(['Destro', 'Esquerdo']),
  skillMoves: z.number().int(),
  weakFootAbility: z.number().int(),
  overallRating: z.number().int(),
  positionShort: PositionCodeSchema,
  alternatePositions: z.array(PositionCodeSchema),
  stats: ScraperStatsSchema,
});

export type ScraperPlayer = z.infer<typeof ScraperPlayerSchema>;
export type ScraperStats = z.infer<typeof ScraperStatsSchema>;
