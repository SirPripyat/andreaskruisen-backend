import { z } from 'zod';

// Query string chega como texto; z.coerce.boolean() trataria qualquer valor
// não vazio (inclusive a string "false") como true, então só aceitamos os
// literais esperados.
export const booleanQueryParam = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .optional()
    .transform((value) =>
      value === undefined ? defaultValue : value === 'true',
    );
