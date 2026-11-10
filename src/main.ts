import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './commons/filters/all-exceptions.filter';
import { LoggingInterceptor } from './commons/interceptors/logging.interceptor';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Atrás do Caddy (reverse proxy): sem isso, o IP de todo mundo chega como
  // o do proxy, e o rate limiting (ThrottlerGuard) trataria todos os
  // usuários como um único cliente.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableShutdownHooks();
  app.enableCors({
    origin: configService.getOrThrow<string>('FRONTEND_URL'),
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(configService.get<number>('PORT') ?? 3000);
};

bootstrap();
