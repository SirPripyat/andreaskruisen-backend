import { ageRangeToBirthdateRange } from '../age-range.utils';

describe('ageRangeToBirthdateRange', () => {
  const now = new Date('2026-11-10T00:00:00.000Z');

  it('returns no bounds when neither age is given', () => {
    expect(ageRangeToBirthdateRange(undefined, undefined, now)).toEqual({
      birthdateMin: undefined,
      birthdateMax: undefined,
    });
  });

  it('converts ageMin into the max birthdate allowed', () => {
    const { birthdateMax } = ageRangeToBirthdateRange(18, undefined, now);

    expect(birthdateMax).toEqual(new Date('2008-11-10T00:00:00.000Z'));
  });

  it('converts ageMax into the min birthdate allowed, exclusive', () => {
    const { birthdateMin } = ageRangeToBirthdateRange(undefined, 25, now);

    expect(birthdateMin).toEqual(new Date('2000-11-10T00:00:00.000Z'));
  });

  it('excludes someone who just turned ageMax + 1 today', () => {
    const { birthdateMin } = ageRangeToBirthdateRange(undefined, 25, now);
    const turnedTwentySixToday = new Date('2000-11-10T00:00:00.000Z');

    expect(birthdateMin).toBeDefined();
    expect(turnedTwentySixToday > (birthdateMin as Date)).toBe(false);
  });

  it('includes someone who turns ageMax + 1 tomorrow', () => {
    const { birthdateMin } = ageRangeToBirthdateRange(undefined, 25, now);
    const turnsTwentySixTomorrow = new Date('2000-11-11T00:00:00.000Z');

    expect(birthdateMin).toBeDefined();
    expect(turnsTwentySixTomorrow > (birthdateMin as Date)).toBe(true);
  });

  it('sets both bounds when both ages are given', () => {
    const { birthdateMin, birthdateMax } = ageRangeToBirthdateRange(
      18,
      25,
      now,
    );

    expect(birthdateMax).toEqual(new Date('2008-11-10T00:00:00.000Z'));
    expect(birthdateMin).toEqual(new Date('2000-11-10T00:00:00.000Z'));
  });
});
