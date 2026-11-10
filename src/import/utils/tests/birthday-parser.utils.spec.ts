import { parseBirthdate } from '../birthday-parser.utils';

describe('parseBirthdate', () => {
  it('parseia o formato ISO (YYYY-MM-DD) como meia-noite UTC', () => {
    const date = parseBirthdate('1996-05-02');

    expect(date.toISOString()).toBe('1996-05-02T00:00:00.000Z');
  });

  it('parseia o formato americano (M/D/YYYY) sem horário como meia-noite UTC', () => {
    const date = parseBirthdate('5/2/1996');

    expect(date.toISOString()).toBe('1996-05-02T00:00:00.000Z');
  });

  it('parseia o formato americano com horário (M/D/YYYY H:MM)', () => {
    const date = parseBirthdate('5/2/1996 14:30');

    expect(date.toISOString()).toBe('1996-05-02T14:30:00.000Z');
  });
});
