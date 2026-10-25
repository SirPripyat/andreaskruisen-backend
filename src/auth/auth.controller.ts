import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { type Login, LoginSchema } from './dto/login.schema';
import { AuthenticatedRequest, SessionAuthGuard } from './session-auth.guard';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: Login,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token, expiresAt } = await this.authService.login(dto);

    response.cookie(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(expiresAt),
    );

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.cookies[SESSION_COOKIE_NAME]);
    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
