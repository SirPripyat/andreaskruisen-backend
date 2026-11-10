import { PlayerPositionInput } from '../../../players/players.repository';
import { ScraperPlayer, ScraperStats } from '../../dto';
import { arePositionsEqual, mapPositions } from '../positions.utils';

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

describe('mapPositions', () => {
  it('marca positionShort como principal e alternatePositions como não-principais', () => {
    const player = buildPlayer({
      positionShort: 'MEI',
      alternatePositions: ['MC', 'VOL'],
    });

    expect(mapPositions(player)).toEqual([
      { position: 'MEI', isPrimary: true },
      { position: 'MC', isPrimary: false },
      { position: 'VOL', isPrimary: false },
    ]);
  });

  it('sem alternatePositions devolve só a posição principal', () => {
    const player = buildPlayer({
      positionShort: 'GOL',
      alternatePositions: [],
    });

    expect(mapPositions(player)).toEqual([
      { position: 'GOL', isPrimary: true },
    ]);
  });
});

describe('arePositionsEqual', () => {
  it('considera igual mesmo com ordem diferente', () => {
    const a: PlayerPositionInput[] = [
      { position: 'MC', isPrimary: false },
      { position: 'MEI', isPrimary: true },
    ];
    const b: PlayerPositionInput[] = [
      { position: 'MEI', isPrimary: true },
      { position: 'MC', isPrimary: false },
    ];

    expect(arePositionsEqual(a, b)).toBe(true);
  });

  it('considera diferente quando a quantidade de posições muda', () => {
    const a: PlayerPositionInput[] = [{ position: 'MEI', isPrimary: true }];
    const b: PlayerPositionInput[] = [
      { position: 'MEI', isPrimary: true },
      { position: 'MC', isPrimary: false },
    ];

    expect(arePositionsEqual(a, b)).toBe(false);
  });

  it('considera diferente quando isPrimary muda pra mesma posição', () => {
    const a: PlayerPositionInput[] = [{ position: 'MEI', isPrimary: true }];
    const b: PlayerPositionInput[] = [{ position: 'MEI', isPrimary: false }];

    expect(arePositionsEqual(a, b)).toBe(false);
  });
});
