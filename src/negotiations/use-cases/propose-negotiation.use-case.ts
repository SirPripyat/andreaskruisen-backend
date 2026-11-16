import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Squad } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../../squads/squads.repository';
import { HasActiveTournamentUseCase } from '../../tournaments/use-cases';
import { ProposeNegotiationRequestDTO } from '../dto';
import { NegotiationResponseDTO } from '../dto/response';
import { NegotiationsRepository } from '../negotiations.repository';
import { NegotiationAssignment } from '../types';

@Injectable()
export class ProposeNegotiationUseCase {
  constructor(
    private readonly negotiationsRepository: NegotiationsRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly hasActiveTournamentUseCase: HasActiveTournamentUseCase,
  ) {}

  async execute(
    seasonId: string,
    userId: string,
    dto: ProposeNegotiationRequestDTO,
  ): Promise<NegotiationResponseDTO> {
    await this.ensureSeasonExists(seasonId);
    await this.ensureNoActiveTournament(seasonId);

    const proposingSquad = await this.getSquadOrThrow(userId, seasonId);
    const targetSquad = await this.squadsRepository.findByTeamAndSeason(
      dto.targetTeamId,
      seasonId,
    );

    if (!targetSquad)
      throw new NotFoundException(
        'Time de destino não encontrado nessa temporada',
      );

    if (targetSquad.id === proposingSquad.id)
      throw new BadRequestException(
        'Você não pode negociar com seu próprio time',
      );

    const outgoing = dto.outgoingPlayerId
      ? await this.getAssignmentOrThrow(
          seasonId,
          dto.outgoingPlayerId,
          proposingSquad.teamId,
          'que sai',
        )
      : null;
    const incoming = dto.incomingPlayerId
      ? await this.getAssignmentOrThrow(
          seasonId,
          dto.incomingPlayerId,
          targetSquad.teamId,
          'que entra',
        )
      : null;

    return this.negotiationsRepository.create({
      seasonId,
      proposingSquadId: proposingSquad.id,
      targetSquadId: targetSquad.id,
      outgoingPlayerId: outgoing?.player.id ?? null,
      incomingPlayerId: incoming?.player.id ?? null,
      coinAmount: dto.coinAmount ?? null,
    });
  }

  private async ensureSeasonExists(seasonId: string): Promise<void> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');
  }

  private async ensureNoActiveTournament(seasonId: string): Promise<void> {
    const hasActiveTournament =
      await this.hasActiveTournamentUseCase.execute(seasonId);

    if (!hasActiveTournament) return;

    throw new ConflictException(
      'Negociações só são permitidas quando não há torneio em andamento nessa temporada',
    );
  }

  private async getSquadOrThrow(
    userId: string,
    seasonId: string,
  ): Promise<Squad> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    return squad;
  }

  private async getAssignmentOrThrow(
    seasonId: string,
    playerId: string,
    expectedTeamId: string,
    label: string,
  ): Promise<NegotiationAssignment> {
    const assignment = await this.negotiationsRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!assignment)
      throw new NotFoundException(
        `Jogador ${label} não encontrado nessa temporada`,
      );

    if (assignment.team.id !== expectedTeamId)
      throw new ForbiddenException(
        `Jogador ${label} não está no time esperado`,
      );

    return assignment;
  }
}
