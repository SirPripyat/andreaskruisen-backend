import { Injectable } from '@nestjs/common';
import { GetTeamResponseDTO } from '../dto/response';
import { FindTeamOrThrowUseCase } from './find-team-or-throw.use-case';
import { GetTeamStatsUseCase } from './get-team-stats.use-case';

@Injectable()
export class GetTeamUseCase {
  constructor(
    private readonly findTeamOrThrowUseCase: FindTeamOrThrowUseCase,
    private readonly getTeamStatsUseCase: GetTeamStatsUseCase,
  ) {}

  async execute(id: string, seasonId: string): Promise<GetTeamResponseDTO> {
    const team = await this.findTeamOrThrowUseCase.execute(id);
    const stats = await this.getTeamStatsUseCase.execute(id, seasonId);
    return { ...team, ...stats };
  }
}
