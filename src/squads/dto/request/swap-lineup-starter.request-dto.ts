import { z } from 'zod';

// Nomes de campo mantidos por compatibilidade com o front já integrado,
// mas hoje aceitam qualquer par de jogadores do elenco (titular↔banco ou
// titular↔titular) — ver SwapLineupStarterUseCase.
export const SwapLineupStarterSchema = z
  .object({
    starterOutId: z.uuid(),
    benchInId: z.uuid(),
  })
  .refine((data) => data.starterOutId !== data.benchInId, {
    message: 'Os jogadores precisam ser diferentes',
    path: ['benchInId'],
  });

export type SwapLineupStarterRequestDTO = z.infer<
  typeof SwapLineupStarterSchema
>;
