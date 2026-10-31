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
import { CreateUser, CreateUserSchema } from './dto/create-user.schema';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUser) {
    await this.usersService.create(dto);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, AdminGuard)
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.usersService.remove(id, request.user.id);
  }
}
