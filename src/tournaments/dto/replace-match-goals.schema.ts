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

export const ReplaceMatchGoalsSchema = z.object({
  goals: z.array(GoalSchema).max(50),
});

export type ReplaceMatchGoals = z.infer<typeof ReplaceMatchGoalsSchema>;
