import { z } from 'zod';

export const csvArray = <T extends z.ZodType>(itemSchema: T) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined;

    const rawValues = Array.isArray(value) ? value : [value];

    return rawValues
      .flatMap((rawValue) => String(rawValue).split(','))
      .filter((item) => item.length > 0);
  }, z.array(itemSchema).optional());
