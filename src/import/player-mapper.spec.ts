import { PositionCode, PreferredFoot } from '../../generated/prisma/client';
import {
  mapPositions,
  mapPreferredFoot,
  mapRating,
  parseBirthdate,
  ratingsEqual,
} from './player-mapper';
import type { ScraperPlayer } from './scraper-player.schema';

function buildPlayer(overrides: Partial<ScraperPlayer> = {}): ScraperPlayer {
  return {
    id: 212194,
    name: 'Julian Brandt',
    photoUrl: 'https://example.com/photo.png',
    team: 'Ajax',
    teamCrestUrl: 'https://example.com/crest.png',
    nationality: 'Alemanha',
    nationalityFlagUrl: 'https://example.com/flag.png',
    league: 'Eredivisie',
    birthdate: '5/2/1996 0:00',
    preferredFoot: 'Destro',
    skillMoves: 4,
    weakFootAbility: 4,
    overallRating: 82,
    positionShort: 'MEI',
    alternatePositions: ['MC', 'VOL'],
    stats: {
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
      def: 45,
      defensiveAwareness: 49,
      dri: 84,
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
      pac: 69,
      pas: 83,
      penalties: 55,
      phy: 69,
      positioning: 82,
      reactions: 82,
      sho: 77,
      shortPassing: 85,
      shotPower: 82,
      slidingTackle: 39,
      sprintSpeed: 71,
      standingTackle: 32,
      vision: 86,
      volleys: 85,
    },
    ...overrides,
  };
}

describe('mapPreferredFoot', () => {
  it('maps Destro to RIGHT', () => {
    expect(mapPreferredFoot('Destro')).toBe(PreferredFoot.RIGHT);
  });

  it('maps Esquerdo to LEFT', () => {
    expect(mapPreferredFoot('Esquerdo')).toBe(PreferredFoot.LEFT);
  });
});

describe('parseBirthdate', () => {
  it('parses M/D/YYYY H:mm as UTC midnight', () => {
    const date = parseBirthdate('12/20/1998 0:00');
    expect(date.toISOString()).toBe('1998-12-20T00:00:00.000Z');
  });

  it('is not affected by the local timezone of the machine running it', () => {
    const date = parseBirthdate('1/5/2000 0:00');
    expect(date.getUTCFullYear()).toBe(2000);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(5);
  });
});

describe('mapPositions', () => {
  it('marks positionShort as primary and alternatePositions as non-primary', () => {
    const player = buildPlayer();
    expect(mapPositions(player)).toEqual([
      { position: 'MEI', isPrimary: true },
      { position: 'MC', isPrimary: false },
      { position: 'VOL', isPrimary: false },
    ]);
  });

  it('returns only the primary position when there are no alternates', () => {
    const player = buildPlayer({
      positionShort: PositionCode.GOL,
      alternatePositions: [],
    });
    expect(mapPositions(player)).toEqual([
      { position: 'GOL', isPrimary: true },
    ]);
  });
});

describe('ratingsEqual', () => {
  it('returns true for identical ratings', () => {
    const player = buildPlayer();
    const a = mapRating(player);
    const b = mapRating(buildPlayer());
    expect(ratingsEqual(a, b)).toBe(true);
  });

  it('returns false when overallRating changes', () => {
    const a = mapRating(buildPlayer());
    const b = mapRating(buildPlayer({ overallRating: 90 }));
    expect(ratingsEqual(a, b)).toBe(false);
  });

  it('returns false when a deep stat attribute changes', () => {
    const a = mapRating(buildPlayer());
    const b = mapRating(
      buildPlayer({ stats: { ...buildPlayer().stats, sprintSpeed: 99 } }),
    );
    expect(ratingsEqual(a, b)).toBe(false);
  });
});
