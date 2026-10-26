import { z } from 'zod';
import { PaginationSchema } from '../../commons/pagination';

export const ListPlayersSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
});

export type ListPlayersQuery = z.infer<typeof ListPlayersSchema>;
