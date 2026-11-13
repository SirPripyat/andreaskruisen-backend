import {
  computeRatingCategories,
  RatingSubAttributes,
} from '../rating-categories.utils';

const STATS: RatingSubAttributes = {
  acceleration: 80,
  sprintSpeed: 90,
  positioning: 82,
  finishing: 76,
  shotPower: 82,
  longShots: 76,
  volleys: 85,
  penalties: 55,
  vision: 86,
  crossing: 78,
  freeKickAccuracy: 78,
  shortPassing: 85,
  longPassing: 83,
  curve: 82,
  agility: 78,
  balance: 82,
  reactions: 82,
  ballControl: 86,
  dribbling: 84,
  composure: 85,
  interceptions: 54,
  headingAccuracy: 57,
  defensiveAwareness: 49,
  standingTackle: 32,
  slidingTackle: 39,
  jumping: 70,
  stamina: 83,
  strength: 71,
  aggression: 44,
};

describe('computeRatingCategories', () => {
  it('calcula pac como a média de acceleration e sprintSpeed', () => {
    expect(computeRatingCategories(STATS).pac).toBe(85);
  });

  it('calcula sho como a média dos atributos de finalização', () => {
    const { sho } = computeRatingCategories(STATS);

    // (82+76+82+76+85+55)/6 = 76.0
    expect(sho).toBe(76);
  });

  it('calcula pas como a média dos atributos de passe', () => {
    const { pas } = computeRatingCategories(STATS);

    // (86+78+78+85+83+82)/6 = 82.0
    expect(pas).toBe(82);
  });

  it('calcula dri como a média dos atributos de drible', () => {
    const { dri } = computeRatingCategories(STATS);

    // (78+82+82+86+84+85)/6 = 82.83...
    expect(dri).toBe(83);
  });

  it('calcula def como a média dos atributos de defesa', () => {
    const { def } = computeRatingCategories(STATS);

    // (54+57+49+32+39)/5 = 46.2
    expect(def).toBe(46);
  });

  it('calcula phy como a média dos atributos físicos', () => {
    const { phy } = computeRatingCategories(STATS);

    // (70+83+71+44)/4 = 67.0
    expect(phy).toBe(67);
  });
});
