import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const parseJsonBuffer = <T>(
  fileBuffer: Buffer,
  schema: z.ZodType<T>,
  label: string,
): T => {
  let raw: unknown;
  try {
    raw = JSON.parse(fileBuffer.toString('utf-8'));
  } catch {
    throw new BadRequestException('Arquivo não é um JSON válido');
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new BadRequestException({
      message: `JSON não corresponde ao schema de ${label} esperado`,
      errors: parsed.error.issues,
    });
  }

  return parsed.data;
};
