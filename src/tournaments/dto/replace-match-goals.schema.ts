import { z } from 'zod';

// Sem gol contra por ora: toda assistência precisa ser do mesmo time do
// artilheiro (validado em TournamentsService.replaceMatchGoals, já que
// depende de saber o time de cada jogador).
const GoalSchema = z
  .object({
    scorerId: z.string().uuid(),
    assistId: z.string().uuid().optional(),
  })
  .refine((goal) => goal.assistId !== goal.scorerId, {
    message: 'O artilheiro não pode ser o assistente do próprio gol',
    path: ['assistId'],
  });

// Só exigido pelo service quando a partida é de mata-mata e o placar (dos
// goals acima) empata — eliminatória não pode terminar empatada (ver
// TournamentsService.replaceMatchGoals). A validação de empate/fase fica no
// service, que é quem sabe o tipo da fase e recalcula o placar.
const PenaltiesSchema = z
  .object({
    homeScore: z.number().int().min(0),
    awayScore: z.number().int().min(0),
  })
  .refine((penalties) => penalties.homeScore !== penalties.awayScore, {
    message: 'Pênaltis não podem terminar empatados',
    path: ['awayScore'],
  });

export const ReplaceMatchGoalsSchema = z.object({
  goals: z.array(GoalSchema).max(50),
  penalties: PenaltiesSchema.optional(),
});

export type ReplaceMatchGoals = z.infer<typeof ReplaceMatchGoalsSchema>;
