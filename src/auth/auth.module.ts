import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthFacade } from './auth.facade';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionsRepository } from './sessions.repository';
import {
  LoginUseCase,
  LogoutUseCase,
  ValidateSessionUseCase,
} from './use-cases';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [
    SessionsRepository,
    AuthFacade,
    LoginUseCase,
    LogoutUseCase,
    ValidateSessionUseCase,
    SessionAuthGuard,
    RolesGuard,
  ],
  exports: [SessionAuthGuard, RolesGuard, ValidateSessionUseCase],
})
export class AuthModule {}
