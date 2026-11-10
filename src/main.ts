import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './commons/filters/all-exceptions.filter';
import { LoggingInterceptor } from './commons/interceptors/logging.interceptor';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
};

bootstrap();
