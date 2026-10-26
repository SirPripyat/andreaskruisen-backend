import { z } from 'zod';

export const ImportPlayersSchema = z.object({
  // Opcional: momento em que o scraper coletou os dados. Sem isso, assume o
  // momento do upload (diferente do CLI, que usa a data de modificação do arquivo).
  capturedAt: z.coerce.date().optional(),
});

export type ImportPlayersDto = z.infer<typeof ImportPlayersSchema>;
