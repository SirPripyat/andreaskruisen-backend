import { z } from 'zod';
import { FORMATION_DISPLAY_TO_ENUM } from '../../import/utils/formation-mapper.utils';

const KNOWN_FORMATIONS = Object.keys(FORMATION_DISPLAY_TO_ENUM) as [
  string,
  ...string[],
];

export const ChangeSquadFormationSchema = z.object({
  formation: z.enum(KNOWN_FORMATIONS),
});

export type ChangeSquadFormation = z.infer<typeof ChangeSquadFormationSchema>;
