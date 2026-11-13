import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/auth.service';
import { GetMeResponseDTO } from '../dto';
import { MeRepository } from '../me.repository';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly meRepository: MeRepository) {}

  async execute(
    user: AuthenticatedUser,
    seasonId: string,
  ): Promise<GetMeResponseDTO> {
    const teamId = await this.meRepository.findSquadTeamId(user.id, seasonId);

    return { ...user, teamId };
  }
}
