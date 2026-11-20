import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Squad } from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../auth/types';
import { GetOpenNegotiationWindowUseCase } from '../../negotiation-window/use-cases';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../../squads/squads.repository';
import { HasActiveTournamentUseCase } from '../../tournaments/use-cases';
import { CreateTransferRequestDTO } from '../dto';
import { TransfersRepository } from '../transfers.repository';
import { TransferAssignment } from '../types';
import { calculateTraditionalMarketTransferCost } from '../utils/transfer-pricing.utils';

export type ResolvedTransfer = {
  squad: Squad;
  outgoing: TransferAssignment;
  incoming: TransferAssignment;
  cost: number;
  balance: number;
  useCoupon: boolean;
  couponBalance: number;
  feeEnabled: boolean;
};

// Validações e cálculo compartilhados entre criar uma transferência de
// verdade (CreateTransferUseCase) e só pedir uma prévia de custo
// (QuoteTransferUseCase) — as duas precisam resolver exatamente a mesma
// coisa, só uma delas escreve no final.
@Injectable()
export class ResolveTransferUseCase {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly hasActiveTournamentUseCase: HasActiveTournamentUseCase,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
    private readonly getOpenNegotiationWindowUseCase: GetOpenNegotiationWindowUseCase,
  ) {}

  async execute(
    seasonId: string,
    actingUser: AuthenticatedUser,
    dto: CreateTransferRequestDTO,
  ): Promise<ResolvedTransfer> {
    await this.ensureSeasonExists(seasonId);
    await this.ensureNoActiveTournament(seasonId);
    const feeEnabled = await this.ensureNegotiationWindowOpen(seasonId);

    const outgoing = await this.getOutgoingAssignmentOrThrow(
      seasonId,
      dto.outgoingPlayerId,
    );
    // Admin pode agir em nome de qualquer time (ver CLAUDE.md do backend) —
    // o squad que paga é sempre o do time de saída, não o do admin.
    // Participante só pode mexer no próprio squad.
    const squad =
      actingUser.role === 'ADMIN'
        ? await this.getSquadByTeamOrThrow(outgoing.team.id, seasonId)
        : await this.getOwnSquadOrThrow(actingUser.id, seasonId, outgoing);
    const incoming = await this.getIncomingAssignmentOrThrow(
      seasonId,
      dto.incomingPlayerId,
      outgoing,
    );

    const couponBalance = await this.transfersRepository.findSquadCouponBalance(
      squad.id,
    );
    this.ensureCouponAvailableIfRequested(dto.useCoupon, couponBalance);

    const { transferPricing } =
      await this.getActiveRulesetUseCase.execute(seasonId);

    const cost = calculateTraditionalMarketTransferCost(
      {
        outgoingPlayerOverall: outgoing.player.overall,
        incomingPlayerOverall: incoming.player.overall,
        useCoupon: dto.useCoupon,
        feeEnabled,
      },
      transferPricing,
    );

    const balance = await this.transfersRepository.findSquadBalance(squad.id);

    return {
      squad,
      outgoing,
      incoming,
      cost,
      balance,
      useCoupon: dto.useCoupon,
      couponBalance,
      feeEnabled,
    };
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
      'Transferências só são permitidas quando não há torneio em andamento nessa temporada',
    );
  }

  private async ensureNegotiationWindowOpen(
    seasonId: string,
  ): Promise<boolean> {
    const window = await this.getOpenNegotiationWindowUseCase.execute(seasonId);

    if (!window)
      throw new ConflictException(
        'Transferências só são permitidas com a janela de negociação aberta',
      );

    return window.feeEnabled;
  }

  // Participante: squad é o próprio, e o jogador de saída precisa estar
  // nesse squad (senão estaria tentando negociar time de outra pessoa).
  private async getOwnSquadOrThrow(
    userId: string,
    seasonId: string,
    outgoing: TransferAssignment,
  ): Promise<Squad> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    if (outgoing.team.id !== squad.teamId)
      throw new ForbiddenException('Esse jogador não está no seu time');

    return squad;
  }

  // Admin: squad é sempre o do time de saída escolhido, nunca o do admin.
  private async getSquadByTeamOrThrow(
    teamId: string,
    seasonId: string,
  ): Promise<Squad> {
    const squad = await this.squadsRepository.findByTeamAndSeason(
      teamId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Esse time ainda não tem um squad nessa temporada',
      );

    return squad;
  }

  private async getOutgoingAssignmentOrThrow(
    seasonId: string,
    playerId: string,
  ): Promise<TransferAssignment> {
    const outgoing = await this.transfersRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!outgoing)
      throw new NotFoundException(
        'Jogador que sai não encontrado nessa temporada',
      );

    return outgoing;
  }

  private async getIncomingAssignmentOrThrow(
    seasonId: string,
    playerId: string,
    outgoing: TransferAssignment,
  ): Promise<TransferAssignment> {
    const incoming = await this.transfersRepository.findAssignment(
      seasonId,
      playerId,
    );

    if (!incoming)
      throw new NotFoundException(
        'Jogador que entra não encontrado nessa temporada',
      );

    if (incoming.team.id === outgoing.team.id)
      throw new BadRequestException('Os jogadores já estão no mesmo time');

    return incoming;
  }

  private ensureCouponAvailableIfRequested(
    useCoupon: boolean,
    couponBalance: number,
  ): void {
    if (!useCoupon) return;
    if (couponBalance > 0) return;

    throw new ConflictException(
      'Você não tem cupom de isenção de taxa disponível',
    );
  }
}
