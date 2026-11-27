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
import { CreateTransferRequestDTO } from '../dto';
import { TransfersRepository } from '../transfers.repository';
import { TransferAssignment } from '../types';
import { calculateTraditionalMarketTransferCost } from '../utils/transfer-pricing.utils';

export type ResolvedTransfer = {
  squad: Squad;
  // Até 2 jogadores de cada lado (troca multi-jogador, ver
  // v1-transferencias.md) — 1 no caso comum.
  outgoing: TransferAssignment[];
  incoming: TransferAssignment[];
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
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
    private readonly getOpenNegotiationWindowUseCase: GetOpenNegotiationWindowUseCase,
  ) {}

  async execute(
    seasonId: string,
    actingUser: AuthenticatedUser,
    dto: CreateTransferRequestDTO,
  ): Promise<ResolvedTransfer> {
    await this.ensureSeasonExists(seasonId);
    const feeEnabled = await this.ensureNegotiationWindowOpen(seasonId);

    const outgoing = await this.getOutgoingAssignmentsOrThrow(
      seasonId,
      dto.outgoingPlayerIds,
    );
    // Admin pode agir em nome de qualquer time (ver CLAUDE.md do backend) —
    // o squad que paga é sempre o do time de saída, não o do admin.
    // Participante só pode mexer no próprio squad.
    const squad =
      actingUser.role === 'ADMIN'
        ? await this.getSquadByTeamOrThrow(outgoing[0].team.id, seasonId)
        : await this.getOwnSquadOrThrow(actingUser.id, seasonId, outgoing);
    const incoming = await this.getIncomingAssignmentsOrThrow(
      seasonId,
      dto.incomingPlayerIds,
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
        outgoingOverallSum: outgoing.reduce(
          (sum, assignment) => sum + assignment.player.overall,
          0,
        ),
        incomingOverallSum: incoming.reduce(
          (sum, assignment) => sum + assignment.player.overall,
          0,
        ),
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

  // Participante: squad é o próprio, e os jogadores de saída precisam
  // estar nesse squad (senão estaria tentando negociar time de outra
  // pessoa) — já vêm garantidos do mesmo time entre si (ver
  // ensureSameTeam em getOutgoingAssignmentsOrThrow).
  private async getOwnSquadOrThrow(
    userId: string,
    seasonId: string,
    outgoing: TransferAssignment[],
  ): Promise<Squad> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    if (outgoing[0].team.id !== squad.teamId)
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

  private async getOutgoingAssignmentsOrThrow(
    seasonId: string,
    playerIds: string[],
  ): Promise<TransferAssignment[]> {
    const outgoing = await this.findAssignmentsOrThrow(
      seasonId,
      playerIds,
      'Jogador que sai não encontrado nessa temporada',
    );

    this.ensureSameTeam(
      outgoing,
      'Os jogadores que saem precisam ser todos do mesmo time',
    );

    return outgoing;
  }

  private async getIncomingAssignmentsOrThrow(
    seasonId: string,
    playerIds: string[],
    outgoing: TransferAssignment[],
  ): Promise<TransferAssignment[]> {
    const incoming = await this.findAssignmentsOrThrow(
      seasonId,
      playerIds,
      'Jogador que entra não encontrado nessa temporada',
    );

    this.ensureSameTeam(
      incoming,
      'Os jogadores que entram precisam ser todos do mesmo time',
    );

    if (incoming[0].team.id === outgoing[0].team.id)
      throw new BadRequestException('Os jogadores já estão no mesmo time');

    return incoming;
  }

  private async findAssignmentsOrThrow(
    seasonId: string,
    playerIds: string[],
    notFoundMessage: string,
  ): Promise<TransferAssignment[]> {
    const assignments = await Promise.all(
      playerIds.map((playerId) =>
        this.transfersRepository.findAssignment(seasonId, playerId),
      ),
    );

    if (assignments.some((assignment) => !assignment))
      throw new NotFoundException(notFoundMessage);

    return assignments as TransferAssignment[];
  }

  // Troca multi-jogador (ver v1-transferencias.md) ainda é bilateral: os
  // jogadores de um mesmo lado precisam vir todos do mesmo time, senão não
  // tem como resolver pra qual squad cada um pertence.
  private ensureSameTeam(
    assignments: TransferAssignment[],
    message: string,
  ): void {
    const teamIds = new Set(
      assignments.map((assignment) => assignment.team.id),
    );

    if (teamIds.size > 1) throw new BadRequestException(message);
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
