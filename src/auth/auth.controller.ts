import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { type Login, LoginSchema } from './dto/login.schema';
import { AuthenticatedRequest, SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(LoginSchema)) dto: Login) {
    const { user, token } = await this.authService.login(dto);

    return { user, token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.logout(request.token);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
