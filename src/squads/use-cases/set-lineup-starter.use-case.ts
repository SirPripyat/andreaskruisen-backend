import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { PositionCode } from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../auth/auth.service';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { FORMATION_SLOT_TEMPLATES } from '../constants/formation-slot-templates.constants';
import {
  SetLineupStarterRequestDTO,
  SetLineupStarterResponseDTO,
} from '../dto';
import { SquadsRepository } from '../squads.repository';
import { assertCanManageLineup } from './assert-can-manage-lineup';

// Promove um reserva a titular (ou manda um titular pro banco) sem precisar
// escolher alguém pra trocar — SwapLineupStarterUseCase exige um par e por
// isso nunca muda a quantidade de titulares, o que trava elencos com menos
// de 11 jogadores (não tem titular "sobrando" pra liberar um slot).
@Injectable()
export class SetLineupStarterUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    teamId: string,
    playerId: string,
    dto: SetLineupStarterRequestDTO,
  ): Promise<SetLineupStarterResponseDTO> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) throw new NotFoundException('Temporada não encontrada');

    const squad = await this.squadsRepository.findByTeamAndSeason(
      teamId,
      seasonId,
    );
    assertCanManageLineup(squad, user);

    const assignment =
      await this.squadsRepository.findAssignmentWithPrimaryPosition(
        seasonId,
        playerId,
      );
    if (!assignment || assignment.teamId !== teamId) {
      throw new NotFoundException(
        'Jogador não encontrado no elenco deste time nessa temporada',
      );
    }

    const targetPosition = dto.isStarter
      ? (dto.position ?? assignment.primaryPosition ?? 'ATA')
      : null;

    // Só promovendo (isStarter: true) faz sentido conferir vaga — rebaixar
    // sempre libera espaço, nunca estoura a formação.
    if (targetPosition) {
      await this.assertHasOpenSlot(seasonId, teamId, playerId, targetPosition);
    }

    await this.squadsRepository.setLineupStarter(
      seasonId,
      teamId,
      playerId,
      dto.isStarter,
      targetPosition,
    );

    return this.squadsRepository.findLineupOverview(seasonId, teamId);
  }

  // A formação define quantos slots existem pra cada posição (ex: só 1 PD
  // num 4-2-1-3) — promover alguém além dessa conta deixaria o time com
  // mais titulares do que a formação suporta (ver bug que deixou um time
  // com 12 titulares, 2 no mesmo slot "PD").
  private async assertHasOpenSlot(
    seasonId: string,
    teamId: string,
    playerId: string,
    position: PositionCode,
  ): Promise<void> {
    const formation = await this.squadsRepository.findEffectiveFormation(
      seasonId,
      teamId,
    );
    const template = formation ? FORMATION_SLOT_TEMPLATES[formation] : null;
    if (!template) return;

    const capacity = template.filter((slot) => slot === position).length;
    if (capacity === 0) return;

    const currentStarters = await this.squadsRepository.findStarterSlots(
      seasonId,
      teamId,
    );
    const occupied = currentStarters.filter(
      (starter) =>
        starter.playerId !== playerId && starter.position === position,
    ).length;

    if (occupied >= capacity) {
      throw new BadRequestException(
        `A formação atual não tem vaga livre em ${position}`,
      );
    }
  }
}
