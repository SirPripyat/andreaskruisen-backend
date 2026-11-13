import { z } from 'zod';
import { csvArray } from '../csv-array.schema';

describe('csvArray', () => {
  const schema = csvArray(z.string());

  it('returns undefined when the field is absent', () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('splits a single comma-separated value', () => {
    expect(schema.parse('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('merges multiple repeated query values', () => {
    expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('merges repeated values that are themselves comma-separated', () => {
    expect(schema.parse(['a,b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('drops empty segments', () => {
    expect(schema.parse('a,,b,')).toEqual(['a', 'b']);
  });

  it('validates each item against the inner schema', () => {
    const enumSchema = csvArray(z.enum(['GOL', 'ATA']));

    expect(() => enumSchema.parse('GOL,INVALID')).toThrow();
  });
});
