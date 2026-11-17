import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Squad } from '../../../generated/prisma/client';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../../squads/squads.repository';
import { HasActiveTournamentUseCase } from '../../tournaments/use-cases';
import { NegotiationResponseDTO } from '../dto/response';
import { NegotiationsRepository } from '../negotiations.repository';
import { NegotiationAssignment } from '../types';

@Injectable()
export class AcceptNegotiationUseCase {
  constructor(
    private readonly negotiationsRepository: NegotiationsRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly hasActiveTournamentUseCase: HasActiveTournamentUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    await this.ensureSeasonExists(seasonId);
    await this.ensureNoActiveTournament(seasonId);

    const negotiation =
      await this.negotiationsRepository.findByIdWithTeams(negotiationId);

    if (!negotiation || negotiation.seasonId !== seasonId)
      throw new NotFoundException('Negociação não encontrada');

    if (negotiation.status !== 'PENDING')
      throw new ConflictException('Essa negociação já foi resolvida');

    const targetSquad = await this.getSquadOrThrow(userId, seasonId);

    if (targetSquad.id !== negotiation.targetSquadId)
      throw new ForbiddenException(
        'Só o time convidado pode aceitar essa negociação',
      );

    // Revalida que os jogadores ainda estão nos times esperados: entre o
    // propose e o accept, outra negociação ou transferência pode ter movido
    // algum deles.
    const outgoing = negotiation.outgoingPlayerId
      ? await this.getAssignmentOrThrow(
          seasonId,
          negotiation.outgoingPlayerId,
          negotiation.proposingTeamId,
        )
      : null;
    const incoming = negotiation.incomingPlayerId
      ? await this.getAssignmentOrThrow(
          seasonId,
          negotiation.incomingPlayerId,
          negotiation.targetTeamId,
        )
      : null;

    if (negotiation.coinAmount) {
      const payingSquadId =
        negotiation.coinAmount > 0
          ? negotiation.proposingSquadId
          : negotiation.targetSquadId;
      const balance =
        await this.negotiationsRepository.findSquadBalance(payingSquadId);

      if (balance < Math.abs(negotiation.coinAmount))
        throw new ConflictException(
          'Saldo insuficiente para concluir essa negociação',
        );
    }

    const { coupon } = await this.getActiveRulesetUseCase.execute(seasonId);

    return this.negotiationsRepository.accept({
      seasonId,
      negotiationId,
      proposingSquadId: negotiation.proposingSquadId,
      proposingTeamId: negotiation.proposingTeamId,
      targetSquadId: negotiation.targetSquadId,
      targetTeamId: negotiation.targetTeamId,
      outgoing,
      incoming,
      coinAmount: negotiation.coinAmount,
      couponCap: coupon.cap,
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
  ): Promise<NegotiationAssignment> {
    const assignment = await this.negotiationsRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!assignment || assignment.team.id !== expectedTeamId)
      throw new ConflictException(
        'Um dos jogadores dessa negociação não está mais no time esperado',
      );

    return assignment;
  }
}
