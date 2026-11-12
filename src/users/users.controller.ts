import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import {
  AuthenticatedRequest,
  SessionAuthGuard,
} from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { CreateUser, CreateUserSchema } from './dto/request/create-user.schema';
import { UserSummaryResponse } from './dto/response';
import { UsersFacade } from './users.facade';

@Controller('users')
export class UsersController {
  constructor(private readonly usersFacade: UsersFacade) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll(): Promise<UserSummaryResponse[]> {
    return this.usersFacade.findAll();
  }

  @Post()
  @UseGuards(SessionAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUser,
  ): Promise<void> {
    return this.usersFacade.create(dto);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, AdminGuard)
  remove(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.usersFacade.remove(id, request.user.id);
  }
}
