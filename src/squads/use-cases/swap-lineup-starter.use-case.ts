import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AuthenticatedUser } from '../../auth/auth.service';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import {
  SwapLineupStarterRequestDTO,
  SwapLineupStarterResponseDTO,
} from '../dto';
import { SquadsRepository } from '../squads.repository';
import { LineupSlotAssignment } from '../types';
import { assertCanManageLineup } from './assert-can-manage-lineup';

@Injectable()
export class SwapLineupStarterUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    teamId: string,
    dto: SwapLineupStarterRequestDTO,
  ): Promise<SwapLineupStarterResponseDTO> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) throw new NotFoundException('Temporada não encontrada');

    const squad = await this.squadsRepository.findByTeamAndSeason(
      teamId,
      seasonId,
    );
    if (!squad)
      throw new NotFoundException('Esse time não tem elenco nessa temporada');

    assertCanManageLineup(squad, user);

    const first = await this.getAssignmentOrThrow(
      seasonId,
      teamId,
      dto.starterOutId,
    );
    const second = await this.getAssignmentOrThrow(
      seasonId,
      teamId,
      dto.benchInId,
    );

    await this.squadsRepository.swapLineupSlots(
      seasonId,
      teamId,
      dto.starterOutId,
      dto.benchInId,
      first,
      second,
    );

    return this.squadsRepository.findLineupOverview(seasonId, teamId);
  }

  private async getAssignmentOrThrow(
    seasonId: string,
    teamId: string,
    playerId: string,
  ): Promise<LineupSlotAssignment> {
    const assignment = await this.squadsRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!assignment || assignment.teamId !== teamId)
      throw new NotFoundException(
        'Jogador não encontrado no elenco deste time nessa temporada',
      );

    return assignment;
  }
}
