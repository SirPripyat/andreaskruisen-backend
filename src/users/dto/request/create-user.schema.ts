import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(4, "User's name should have at leat 4 characters"),
  pin: z.string().regex(/^\d{4,6}$/),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;
