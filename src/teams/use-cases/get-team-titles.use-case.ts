import { Injectable } from '@nestjs/common';
import { GetTitlesForTeamUseCase } from '../../tournaments/use-cases';
import { GetTeamTitlesResponseDTO } from '../dto/response';
import { FindTeamOrThrowUseCase } from './find-team-or-throw.use-case';

@Injectable()
export class GetTeamTitlesUseCase {
  constructor(
    private readonly findTeamOrThrowUseCase: FindTeamOrThrowUseCase,
    private readonly getTitlesForTeamUseCase: GetTitlesForTeamUseCase,
  ) {}

  async execute(id: string): Promise<GetTeamTitlesResponseDTO> {
    await this.findTeamOrThrowUseCase.execute(id);
    return this.getTitlesForTeamUseCase.execute(id);
  }
}
