import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AuthenticatedUser } from '../../auth/auth.service';
import { FORMATION_DISPLAY_TO_ENUM } from '../../import/utils/formation-mapper.utils';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { FORMATION_SLOT_TEMPLATES } from '../constants/formation-slot-templates.constants';
import { ChangeSquadFormation } from '../dto';
import { SquadsRepository } from '../squads.repository';
import { LineupOverview } from '../types';
import { remapLineupPositions } from '../utils';
import { assertCanManageLineup } from './assert-can-manage-lineup';

@Injectable()
export class ChangeSquadFormationUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    teamId: string,
    dto: ChangeSquadFormation,
  ): Promise<LineupOverview> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) throw new NotFoundException('Temporada não encontrada');

    const squad = await this.squadsRepository.findByTeamAndSeason(
      teamId,
      seasonId,
    );
    if (!squad)
      throw new NotFoundException('Esse time não tem elenco nessa temporada');

    assertCanManageLineup(squad, user);

    const formation = FORMATION_DISPLAY_TO_ENUM[dto.formation];
    const template = FORMATION_SLOT_TEMPLATES[formation];

    const starters = await this.squadsRepository.findStarterSlots(
      seasonId,
      teamId,
    );
    const slots = remapLineupPositions(starters, template);

    await this.squadsRepository.changeFormation(
      seasonId,
      teamId,
      formation,
      slots,
    );

    return this.squadsRepository.findLineupOverview(seasonId, teamId);
  }
}
