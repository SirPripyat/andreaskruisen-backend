import { Injectable } from '@nestjs/common';
import {
  ActiveSeasonResponseDTO,
  AvatarUploadUrlResponseDTO,
  AvatarUrlResponseDTO,
  SelectSeasonResponseDTO,
  UpdateMeRequestDTO,
  UpdateMeResponseDTO,
} from './dto';
import {
  ConfirmAvatarUploadUseCase,
  GetAvatarUploadUrlUseCase,
  GetAvatarUrlUseCase,
  GetMyActiveSeasonUseCase,
  SelectSeasonUseCase,
  UpdateMeUseCase,
} from './use-cases';

@Injectable()
export class MeFacade {
  constructor(
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly selectSeasonUseCase: SelectSeasonUseCase,
    private readonly getMyActiveSeasonUseCase: GetMyActiveSeasonUseCase,
    private readonly getAvatarUploadUrlUseCase: GetAvatarUploadUrlUseCase,
    private readonly confirmAvatarUploadUseCase: ConfirmAvatarUploadUseCase,
    private readonly getAvatarUrlUseCase: GetAvatarUrlUseCase,
  ) {}

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
}
