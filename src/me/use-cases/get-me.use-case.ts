import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/types';
import { GetMeResponseDTO } from '../dto';
import { MeRepository } from '../me.repository';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly meRepository: MeRepository) {}

  async execute(
    user: AuthenticatedUser,
    seasonId: string | null,
  ): Promise<GetMeResponseDTO> {
    const teamId = seasonId
      ? await this.meRepository.findSquadTeamId(user.id, seasonId)
      : null;

    return { ...user, seasonId, teamId };
  }
}
