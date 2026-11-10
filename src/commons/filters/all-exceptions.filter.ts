import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.resolve(exception);

    const context = `${request.method} ${request.url}`;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${context} -> ${status}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      this.logger.warn(`${context} -> ${status} ${JSON.stringify(body)}`);
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    body: string | object;
  } {
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), body: exception.getResponse() };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Requisição inválida',
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor',
      },
    };
  }
}
