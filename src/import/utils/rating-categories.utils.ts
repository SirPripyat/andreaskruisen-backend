// Estrutural de propósito (não Pick<ScraperStats,...>): tanto o ScraperStats
// da importação quanto o PlayerRating do Prisma têm esses mesmos campos, e
// essa função é reusada pelos dois (ver mapOverall e
// backfill-rating-categories.ts) sem precisar depender do tipo de nenhum.
export type RatingSubAttributes = {
  acceleration: number;
  sprintSpeed: number;
  positioning: number;
  finishing: number;
  shotPower: number;
  longShots: number;
  volleys: number;
  penalties: number;
  vision: number;
  crossing: number;
  freeKickAccuracy: number;
  shortPassing: number;
  longPassing: number;
  curve: number;
  agility: number;
  balance: number;
  reactions: number;
  ballControl: number;
  dribbling: number;
  composure: number;
  interceptions: number;
  headingAccuracy: number;
  defensiveAwareness: number;
  standingTackle: number;
  slidingTackle: number;
  jumping: number;
  stamina: number;
  strength: number;
  aggression: number;
};

export type RatingCategories = {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
};

const average = (values: number[]): number =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

// PAC/SHO/PAS/DRI/DEF/PHY (os agregados que a EA exibe) são a média de um
// subconjunto fixo dos atributos detalhados. Usado tanto pra preencher o
// que falta numa importação em que o scraper não os enviou (mapOverall)
// quanto pra corrigir o histórico já gravado (backfill-rating-categories.ts)
// — a mesma fórmula nos dois lugares, pra não divergir.
export const computeRatingCategories = (
  stats: RatingSubAttributes,
): RatingCategories => ({
  pac: average([stats.acceleration, stats.sprintSpeed]),
  sho: average([
    stats.positioning,
    stats.finishing,
    stats.shotPower,
    stats.longShots,
    stats.volleys,
    stats.penalties,
  ]),
  pas: average([
    stats.vision,
    stats.crossing,
    stats.freeKickAccuracy,
    stats.shortPassing,
    stats.longPassing,
    stats.curve,
  ]),
  dri: average([
    stats.agility,
    stats.balance,
    stats.reactions,
    stats.ballControl,
    stats.dribbling,
    stats.composure,
  ]),
  def: average([
    stats.interceptions,
    stats.headingAccuracy,
    stats.defensiveAwareness,
    stats.standingTackle,
    stats.slidingTackle,
  ]),
  phy: average([
    stats.jumping,
    stats.stamina,
    stats.strength,
    stats.aggression,
  ]),
});
