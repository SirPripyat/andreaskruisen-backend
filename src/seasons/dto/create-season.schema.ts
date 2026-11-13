import { z } from 'zod';

const SeasonSquadSchema = z.object({
  userId: z.uuid(),
  teamId: z.uuid(),
});

export const CreateSeasonSchema = z
  .object({
    name: z.string().min(1),
    squads: z.array(SeasonSquadSchema).optional(),
  })
  .refine(
    (data) => {
      if (!data.squads) return true;
      const userIds = data.squads.map((squad) => squad.userId);
      const teamIds = data.squads.map((squad) => squad.teamId);
      return (
        new Set(userIds).size === userIds.length &&
        new Set(teamIds).size === teamIds.length
      );
    },
    {
      message: 'Cada usuário e cada time só pode aparecer uma vez',
      path: ['squads'],
    },
  );

export type CreateSeason = z.infer<typeof CreateSeasonSchema>;
export type CreateSeasonSquad = z.infer<typeof SeasonSquadSchema>;
