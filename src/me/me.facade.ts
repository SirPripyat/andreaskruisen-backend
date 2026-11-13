import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.service';
import {
  ActiveSeasonResponseDTO,
  AvatarUploadUrlResponseDTO,
  AvatarUrlResponseDTO,
  GetMeResponseDTO,
  SelectSeasonResponseDTO,
  UpdateMeRequestDTO,
  UpdateMeResponseDTO,
} from './dto';
import {
  ConfirmAvatarUploadUseCase,
  GetAvatarUploadUrlUseCase,
  GetAvatarUrlUseCase,
  GetDashboardUseCase,
  GetMeUseCase,
  GetMyActiveSeasonUseCase,
  SelectSeasonUseCase,
  UpdateMeUseCase,
} from './use-cases';

@Injectable()
export class MeFacade {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly selectSeasonUseCase: SelectSeasonUseCase,
    private readonly getMyActiveSeasonUseCase: GetMyActiveSeasonUseCase,
    private readonly getAvatarUploadUrlUseCase: GetAvatarUploadUrlUseCase,
    private readonly confirmAvatarUploadUseCase: ConfirmAvatarUploadUseCase,
    private readonly getAvatarUrlUseCase: GetAvatarUrlUseCase,
    private readonly getDashboardUseCase: GetDashboardUseCase,
  ) {}

  getMe(user: AuthenticatedUser, seasonId: string): Promise<GetMeResponseDTO> {
    return this.getMeUseCase.execute(user, seasonId);
  }

  update(id: string, dto: UpdateMeRequestDTO): Promise<UpdateMeResponseDTO> {
    return this.updateMeUseCase.execute(id, dto);
  }

  selectSeason(id: string, seasonId: string): Promise<SelectSeasonResponseDTO> {
    return this.selectSeasonUseCase.execute(id, seasonId);
  }

  getMyActiveSession(id: string): Promise<ActiveSeasonResponseDTO> {
    return this.getMyActiveSeasonUseCase.execute(id);
  }

  getAvatarUploadUrl(
    id: string,
    contentType: string,
  ): Promise<AvatarUploadUrlResponseDTO> {
    return this.getAvatarUploadUrlUseCase.execute(id, contentType);
  }

  confirmAvatarUpload(id: string): Promise<void> {
    return this.confirmAvatarUploadUseCase.execute(id);
  }

  getAvatarUrl(id: string): Promise<AvatarUrlResponseDTO> {
    return this.getAvatarUrlUseCase.execute(id);
  }

  getDashboard(id: string) {
    return this.getDashboardUseCase.execute(id);
  }
}
