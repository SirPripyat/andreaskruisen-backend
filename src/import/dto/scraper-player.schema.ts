import { z } from 'zod';
import { normalizeStatsKeys } from '../utils';

// O scraper passou a chamar o goleiro de "GL" (consistente com o sufixo "GL"
// usado nos atributos de goleiro em stats), em vez de "GOL". Traduzido aqui
// na borda da importação para não mudar o enum canônico, já usado em
// PlayerPosition/TeamLineupSlot.
const POSITION_CODE_ALIASES: Record<string, string> = {
  GL: 'GOL',
};

export const PositionCodeSchema = z.preprocess(
  (raw) =>
    typeof raw === 'string' ? (POSITION_CODE_ALIASES[raw] ?? raw) : raw,
  z.enum([
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
  ]),
);

// pac/sho/pas/dri/def/phy (os agregados PAC/SHO/PAS/DRI/DEF/PHY) deixaram de
// vir no JSON do scraper nessa leva de dados; ficam opcionais até o scraper
// voltar a enviá-los (ver PlayerRating, também tornado opcional lá).
export const ScraperStatsSchema = z.preprocess(
  (raw) =>
    raw && typeof raw === 'object'
      ? normalizeStatsKeys(raw as Record<string, unknown>)
      : raw,
  z.object({
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
    def: z.number().int().optional(),
    defensiveAwareness: z.number().int(),
    dri: z.number().int().optional(),
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
    pac: z.number().int().optional(),
    pas: z.number().int().optional(),
    penalties: z.number().int(),
    phy: z.number().int().optional(),
    positioning: z.number().int(),
    reactions: z.number().int(),
    sho: z.number().int().optional(),
    shortPassing: z.number().int(),
    shotPower: z.number().int(),
    slidingTackle: z.number().int(),
    sprintSpeed: z.number().int(),
    standingTackle: z.number().int(),
    vision: z.number().int(),
    volleys: z.number().int(),
  }),
);

// Alguns jogadores vêm sem clube (agentes livres, ex.: "T. Salman"): team,
// teamCrestUrl e league chegam como string vazia. Como Player.teamId é
// obrigatório (usado no cálculo de elenco), eles são agrupados num time
// placeholder único em vez de serem rejeitados ou de cada um ganhar seu
// próprio "time" fantasma.
const FREE_AGENT_TEAM = {
  team: 'Agente livre',
  teamCrestUrl: 'https://andreaskruisen.internal/free-agent-crest.png',
  league: 'Sem liga',
};

const fillFreeAgentTeam = (
  raw: Record<string, unknown>,
): Record<string, unknown> => (raw.team ? raw : { ...raw, ...FREE_AGENT_TEAM });

// Campos como rank, position (texto completo), cardShieldUrl, height e weight
// vêm no JSON do scraper mas não têm uso no domínio: o zod os ignora por não
// fazerem parte do schema abaixo.
export const ScraperPlayerSchema = z.preprocess(
  (raw) =>
    raw && typeof raw === 'object'
      ? fillFreeAgentTeam(raw as Record<string, unknown>)
      : raw,
  z.object({
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
  }),
);

export type ScraperPlayer = z.infer<typeof ScraperPlayerSchema>;
export type ScraperStats = z.infer<typeof ScraperStatsSchema>;
