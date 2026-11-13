import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  SessionAuthGuard,
} from 'src/auth/session-auth.guard';
import { ZodValidationPipe } from 'src/commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from 'src/seasons/season-context.guard';
import {
  ActiveSeasonResponseDTO,
  AvatarUploadUrlResponseDTO,
  AvatarUrlResponseDTO,
  GetMeResponseDTO,
  SelectSeasonRequestDTO,
  SelectSeasonResponseDTO,
  SelectSeasonSchema,
  UpdateMeRequestDTO,
  UpdateMeResponseDTO,
  UpdateMeSchema,
  UploadAvatarUrlRequestDTO,
  UploadAvatarUrlSchema,
} from './dto';
import { MeFacade } from './me.facade';

@Controller('me')
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(private readonly facade: MeFacade) {}

  @Get()
  @UseGuards(SeasonContextGuard)
  getMe(@Req() request: SeasonScopedRequest): Promise<GetMeResponseDTO> {
    return this.facade.getMe(request.user, request.seasonId);
  }

  @Patch()
  update(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateMeSchema)) dto: UpdateMeRequestDTO,
  ): Promise<UpdateMeResponseDTO> {
    return this.facade.update(request.user.id, dto);
  }

  @Patch('selected-season')
  selectSeason(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(SelectSeasonSchema))
    dto: SelectSeasonRequestDTO,
  ): Promise<SelectSeasonResponseDTO> {
    return this.facade.selectSeason(request.user.id, dto.seasonId);
  }

  @Get('active-season')
  getActiveSeason(
    @Req() request: AuthenticatedRequest,
  ): Promise<ActiveSeasonResponseDTO> {
    return this.facade.getMyActiveSession(request.user.id);
  }

  @Post('avatar/upload-url')
  getAvatarUploadUrl(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UploadAvatarUrlSchema))
    dto: UploadAvatarUrlRequestDTO,
  ): Promise<AvatarUploadUrlResponseDTO> {
    return this.facade.getAvatarUploadUrl(request.user.id, dto.contentType);
  }

  @Patch('avatar/confirm')
  confirmAvatarUpload(@Req() request: AuthenticatedRequest): Promise<void> {
    return this.facade.confirmAvatarUpload(request.user.id);
  }

  @Get('avatar')
  getAvatarUrl(
    @Req() request: AuthenticatedRequest,
  ): Promise<AvatarUrlResponseDTO> {
    return this.facade.getAvatarUrl(request.user.id);
  }

  @Get('dashboard')
  getDashboard(@Req() request: AuthenticatedRequest) {
    return this.facade.getDashboard(request.user.id);
  }
}
