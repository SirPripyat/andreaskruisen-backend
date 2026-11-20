import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { AllExceptionsFilter } from '../all-exceptions.filter';

const buildHost = () => {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const request = { method: 'POST', url: '/seasons' };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
};

describe('AllExceptionsFilter', () => {
  it('devolve a mensagem/status do HttpException e loga em warn', () => {
    const filter = new AllExceptionsFilter();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { host, response } = buildHost();

    filter.catch(new BadRequestException('nome inválido'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'nome inválido',
      error: 'Bad Request',
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('sanitiza um PrismaClientKnownRequestError pro cliente, mas loga o erro real', () => {
    const filter = new AllExceptionsFilter();
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { host, response } = buildHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', clientVersion: '7.10.1' },
    );

    filter.catch(prismaError, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Requisição inválida',
    });
    // O erro real (code, meta, message) nunca chega no cliente — mas
    // precisa estar no log, senão a causa fica sem rastro nenhum.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('POST /seasons -> 400'),
      prismaError,
    );
  });

  it('erro desconhecido vira 500 genérico pro cliente e loga a exceção', () => {
    const filter = new AllExceptionsFilter();
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { host, response } = buildHost();

    const unknownError = new Error('boom');
    filter.catch(unknownError, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Erro interno do servidor',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('POST /seasons -> 500'),
      unknownError,
    );
  });
});
