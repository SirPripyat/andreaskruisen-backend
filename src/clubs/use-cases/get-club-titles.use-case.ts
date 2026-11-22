import { Injectable } from '@nestjs/common';
import { GetTitlesForTeamUseCase } from '../../tournaments/use-cases';
import { GetClubTitlesResponseDTO } from '../dto/response';
import { FindClubOrThrowUseCase } from './find-club-or-throw.use-case';

@Injectable()
export class GetClubTitlesUseCase {
  constructor(
    private readonly findClubOrThrowUseCase: FindClubOrThrowUseCase,
    private readonly getTitlesForTeamUseCase: GetTitlesForTeamUseCase,
  ) {}

  async execute(
    id: string,
    seasonId: string,
  ): Promise<GetClubTitlesResponseDTO> {
    await this.findClubOrThrowUseCase.execute(id, seasonId);
    return this.getTitlesForTeamUseCase.execute(id, seasonId);
  }
}
