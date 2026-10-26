import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionsRepository, SessionAuthGuard, AdminGuard],
  exports: [AuthService, SessionAuthGuard, AdminGuard],
})
export class AuthModule {}
