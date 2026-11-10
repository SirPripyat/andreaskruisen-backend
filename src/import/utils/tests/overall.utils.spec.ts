import { ScraperPlayer, ScraperStats } from '../../dto';
import { mapOverall, overallsEqual } from '../overall.utils';

const MINIMAL_STATS: ScraperStats = {
  acceleration: 67,
  agility: 78,
  jumping: 70,
  stamina: 83,
  strength: 71,
  aggression: 44,
  balance: 82,
  ballControl: 86,
  composure: 85,
  crossing: 78,
  curve: 82,
  defensiveAwareness: 49,
  dribbling: 84,
  finishing: 76,
  freeKickAccuracy: 78,
  gkDiving: 11,
  gkHandling: 16,
  gkKicking: 11,
  gkPositioning: 8,
  gkReflexes: 9,
  headingAccuracy: 57,
  interceptions: 54,
  longPassing: 83,
  longShots: 76,
  penalties: 55,
  positioning: 82,
  reactions: 82,
  shortPassing: 85,
  shotPower: 82,
  slidingTackle: 39,
  sprintSpeed: 71,
  standingTackle: 32,
  vision: 86,
  volleys: 85,
};

const buildPlayer = (
  overrides: Partial<ScraperPlayer> = {},
): ScraperPlayer => ({
  id: 212194,
  name: 'Julian Brandt',
  photoUrl: 'https://example.com/photo.png',
  team: 'Ajax',
  teamCrestUrl: 'https://example.com/crest.png',
  nationality: 'Alemanha',
  nationalityFlagUrl: 'https://example.com/flag.png',
  league: 'Eredivisie',
  birthdate: '1996-05-02',
  preferredFoot: 'Destro',
  skillMoves: 4,
  weakFootAbility: 4,
  overallRating: 82,
  positionShort: 'MEI',
  alternatePositions: ['MC', 'VOL'],
  stats: MINIMAL_STATS,
  ...overrides,
});

describe('mapOverall', () => {
  it('monta o NormalizedRating a partir dos campos do jogador e do stats', () => {
    const rating = mapOverall(buildPlayer());

    expect(rating.overallRating).toBe(82);
    expect(rating.skillMoves).toBe(4);
    expect(rating.weakFootAbility).toBe(4);
    expect(rating.crossing).toBe(78);
    expect(rating.gkReflexes).toBe(9);
  });
});

describe('overallsEqual', () => {
  it('considera igual quando todos os campos de RATING_FIELD_NAMES batem', () => {
    const a = mapOverall(buildPlayer());
    const b = mapOverall(buildPlayer());

    expect(overallsEqual(a, b)).toBe(true);
  });

  it('considera diferente quando overallRating muda', () => {
    const a = mapOverall(buildPlayer());
    const b = mapOverall(buildPlayer({ overallRating: 90 }));

    expect(overallsEqual(a, b)).toBe(false);
  });

  it('considera diferente quando um atributo de stats muda', () => {
    const a = mapOverall(buildPlayer());
    const b = mapOverall(
      buildPlayer({ stats: { ...MINIMAL_STATS, crossing: 99 } }),
    );

    expect(overallsEqual(a, b)).toBe(false);
  });
});
