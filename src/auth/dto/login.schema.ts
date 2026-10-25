import { z } from 'zod';

export const LoginSchema = z.object({
  name: z.string().min(1),
  pin: z.string().min(1),
});

export type Login = z.infer<typeof LoginSchema>;
