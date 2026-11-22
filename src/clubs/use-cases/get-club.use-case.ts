import { Injectable } from '@nestjs/common';
import { GetTeamStatsUseCase } from '../../teams/use-cases';
import { GetClubResponseDTO } from '../dto/response';
import { FindClubOrThrowUseCase } from './find-club-or-throw.use-case';

@Injectable()
export class GetClubUseCase {
  constructor(
    private readonly findClubOrThrowUseCase: FindClubOrThrowUseCase,
    private readonly getTeamStatsUseCase: GetTeamStatsUseCase,
  ) {}

  async execute(id: string, seasonId: string): Promise<GetClubResponseDTO> {
    const club = await this.findClubOrThrowUseCase.execute(id, seasonId);
    const stats = await this.getTeamStatsUseCase.execute(id, seasonId);
    return { ...club, ...stats };
  }
}
