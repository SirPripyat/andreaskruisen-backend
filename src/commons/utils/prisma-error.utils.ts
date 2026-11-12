import { Prisma } from '../../../generated/prisma/client';

export const PRISMA_ERROR_CODE = {
  UNIQUE_CONSTRAINT_VIOLATION: 'P2002',
  FOREIGN_KEY_VIOLATION: 'P2003',
} as const;

type PrismaErrorCode =
  (typeof PRISMA_ERROR_CODE)[keyof typeof PRISMA_ERROR_CODE];

export const isPrismaErrorCode = (
  error: unknown,
  code: PrismaErrorCode,
): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
