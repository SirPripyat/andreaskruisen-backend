import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { SelectSeason, SelectSeasonSchema } from './dto/select-season.schema';
import {
  UpdateProfile,
  UpdateProfileSchema,
} from './dto/update-profile.schema';
import { UploadAvatar, UploadAvatarSchema } from './dto/upload-avatar.schema';
import {
  ConfirmAvatarUploadUseCase,
  CreateUserUseCase,
  GetAvatarUploadUrlUseCase,
  GetAvatarUrlUseCase,
  ListUsersUseCase,
  RemoveUserUseCase,
  SelectSeasonUseCase,
  UpdateProfileUseCase,
} from './use-cases';

@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly removeUserUseCase: RemoveUserUseCase,
    private readonly selectSeasonUseCase: SelectSeasonUseCase,
    private readonly getAvatarUploadUrlUseCase: GetAvatarUploadUrlUseCase,
    private readonly confirmAvatarUploadUseCase: ConfirmAvatarUploadUseCase,
    private readonly getAvatarUrlUseCase: GetAvatarUrlUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  findAll() {
    return this.listUsersUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUser) {
    await this.createUserUseCase.execute(dto);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, AdminGuard)
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.removeUserUseCase.execute(id, request.user.id);
  }

  @Patch('me')
  @UseGuards(SessionAuthGuard)
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfile,
  ) {
    return this.updateProfileUseCase.execute(request.user.id, dto);
  }

  @Patch('me/selected-season')
  @UseGuards(SessionAuthGuard)
  selectSeason(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(SelectSeasonSchema)) dto: SelectSeason,
  ) {
    return this.selectSeasonUseCase.execute(request.user.id, dto.seasonId);
  }

  @Post('me/avatar/upload-url')
  @UseGuards(SessionAuthGuard)
  getAvatarUploadUrl(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UploadAvatarSchema)) dto: UploadAvatar,
  ) {
    return this.getAvatarUploadUrlUseCase.execute(
      request.user.id,
      dto.contentType,
    );
  }

  @Patch('me/avatar/confirm')
  @UseGuards(SessionAuthGuard)
  async confirmAvatarUpload(@Req() request: AuthenticatedRequest) {
    await this.confirmAvatarUploadUseCase.execute(request.user.id);
  }

  @Get('me/avatar')
  @UseGuards(SessionAuthGuard)
  getAvatarUrl(@Req() request: AuthenticatedRequest) {
    return this.getAvatarUrlUseCase.execute(request.user.id);
  }
}
