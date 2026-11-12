import { Prisma } from '../../../../generated/prisma/client';
import { isPrismaErrorCode, PRISMA_ERROR_CODE } from '../prisma-error.utils';

const buildPrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('mensagem de erro', {
    code,
    clientVersion: '7.10.1',
  });

describe('isPrismaErrorCode', () => {
  it('retorna true quando o erro é um PrismaClientKnownRequestError com o código esperado', () => {
    const error = buildPrismaError(PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION);

    expect(
      isPrismaErrorCode(error, PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION),
    ).toBe(true);
  });

  it('retorna false quando o código do erro é diferente do esperado', () => {
    const error = buildPrismaError(
      PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT_VIOLATION,
    );

    expect(
      isPrismaErrorCode(error, PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION),
    ).toBe(false);
  });

  it('retorna false quando o erro não é um PrismaClientKnownRequestError', () => {
    expect(
      isPrismaErrorCode(
        new Error('boom'),
        PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION,
      ),
    ).toBe(false);
  });

  it('retorna false para valores que não são instâncias de erro', () => {
    expect(
      isPrismaErrorCode(undefined, PRISMA_ERROR_CODE.FOREIGN_KEY_VIOLATION),
    ).toBe(false);
  });
});
