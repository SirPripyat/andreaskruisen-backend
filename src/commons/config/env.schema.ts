import { z } from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  FRONTEND_URL: z.string().url('FRONTEND_URL precisa ser uma URL válida'),
  PORT: z.coerce.number().int().positive().default(3000),
  SALT_ROUND: z.coerce.number().int().positive(),
  DEFAULT_USER_NAME: z.string().min(1),
  DEFAULT_USER_PIN: z.string().min(1),
  GCS_BUCKET: z.string().min(1),
  STORAGE_EMULATOR_HOST: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const validateEnv = (config: Record<string, unknown>): Env => {
  const result = EnvSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }

  return result.data;
};
