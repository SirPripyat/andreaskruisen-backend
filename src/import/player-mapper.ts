import { PositionCode, PreferredFoot } from '../../generated/prisma/client';
import type { ScraperPlayer } from './scraper-player.schema';

export function mapPreferredFoot(
  raw: ScraperPlayer['preferredFoot'],
): PreferredFoot {
  return raw === 'Destro' ? PreferredFoot.RIGHT : PreferredFoot.LEFT;
}

// O photoUrl que vem do scraper é do SoFIFA, que bloqueia carregamento direto
// da imagem (hotlink protection). A EA expõe a mesma foto sem esse bloqueio,
// indexada pelo id EA do jogador (= ScraperPlayer.id = Player.eaId). Por isso
// o photoUrl do scraper é ignorado na importação e esta URL é usada no lugar.
// "FC27" precisa ser atualizado quando a EA lançar a próxima versão do jogo.
const EA_PLAYER_PHOTO_GAME_VERSION = 'FC27';

export function buildEaPlayerPhotoUrl(eaId: number): string {
  return `https://ratings-images-prod.pulse.ea.com/${EA_PLAYER_PHOTO_GAME_VERSION}/components/players/p${eaId}.webp`;
}

// O scraper já entregou a data em dois formatos: "M/D/YYYY H:mm" (ex.:
// "12/20/1998 0:00") e, na leva mais recente, ISO "YYYY-MM-DD". Detecta pelo
// formato em vez de assumir um deles, e sempre em UTC para não depender do
// fuso horário de quem roda o import.
export function parseBirthdate(raw: string): Date {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const [datePart, timePart] = raw.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = (timePart ?? '0:00').split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

export interface PlayerPositionInput {
  position: PositionCode;
  isPrimary: boolean;
}

export function mapPositions(player: ScraperPlayer): PlayerPositionInput[] {
  return [
    { position: player.positionShort, isPrimary: true },
    ...player.alternatePositions.map((position) => ({
      position,
      isPrimary: false,
    })),
  ];
}

// Única fonte de verdade sobre quais campos compõem um "rating": usada tanto
// para montar a linha a gravar quanto para comparar com a última capturada.
export const RATING_FIELD_NAMES = [
  'overallRating',
  'skillMoves',
  'weakFootAbility',
  'pac',
  'sho',
  'pas',
  'dri',
  'def',
  'phy',
  'acceleration',
  'agility',
  'jumping',
  'stamina',
  'strength',
  'aggression',
  'balance',
  'ballControl',
  'composure',
  'crossing',
  'curve',
  'defensiveAwareness',
  'dribbling',
  'finishing',
  'freeKickAccuracy',
  'headingAccuracy',
  'interceptions',
  'longPassing',
  'longShots',
  'penalties',
  'positioning',
  'reactions',
  'shortPassing',
  'shotPower',
  'slidingTackle',
  'sprintSpeed',
  'standingTackle',
  'vision',
  'volleys',
  'gkDiving',
  'gkHandling',
  'gkKicking',
  'gkPositioning',
  'gkReflexes',
] as const;

// pac/sho/pas/dri/def/phy ficam opcionais: deixaram de vir no JSON do scraper
// na leva mais recente (ver ScraperStatsSchema).
const OPTIONAL_RATING_FIELD_NAMES = [
  'pac',
  'sho',
  'pas',
  'dri',
  'def',
  'phy',
] as const;

type RequiredRatingFieldName = Exclude<
  (typeof RATING_FIELD_NAMES)[number],
  (typeof OPTIONAL_RATING_FIELD_NAMES)[number]
>;

export type NormalizedRating = Record<RequiredRatingFieldName, number> &
  Partial<Record<(typeof OPTIONAL_RATING_FIELD_NAMES)[number], number>>;

export function mapRating(player: ScraperPlayer): NormalizedRating {
  return {
    overallRating: player.overallRating,
    skillMoves: player.skillMoves,
    weakFootAbility: player.weakFootAbility,
    ...player.stats,
  };
}

export function ratingsEqual(
  a: NormalizedRating,
  b: NormalizedRating,
): boolean {
  return RATING_FIELD_NAMES.every((field) => a[field] === b[field]);
}
