import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { CoinTransactionType, Squad } from '../../../generated/prisma/client';
import { GetOpenNegotiationWindowUseCase } from '../../negotiation-window/use-cases';
import { GetActiveRulesetUseCase } from '../../rulesets/use-cases';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../../squads/squads.repository';
import { TransfersRepository } from '../../transfers/transfers.repository';
import { NegotiationResponseDTO } from '../dto/response';
import { NegotiationsRepository } from '../negotiations.repository';
import { NegotiationAssignment, NegotiationWithTeams } from '../types';
import {
  calculateDirectNegotiationFee,
  DirectNegotiationFee,
  resolveNegotiationCoinTransactions,
  resolveNegotiationCouponRecipients,
} from '../utils';

@Injectable()
export class AcceptNegotiationUseCase {
  constructor(
    private readonly negotiationsRepository: NegotiationsRepository,
    private readonly transfersRepository: TransfersRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly getActiveRulesetUseCase: GetActiveRulesetUseCase,
    private readonly getOpenNegotiationWindowUseCase: GetOpenNegotiationWindowUseCase,
  ) {}

  @Transactional()
  async execute(
    seasonId: string,
    userId: string,
    negotiationId: string,
  ): Promise<NegotiationResponseDTO> {
    await this.ensureSeasonExists(seasonId);
    const feeEnabled = await this.ensureNegotiationWindowOpen(seasonId);

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

    const { coupon, transferPricing } =
      await this.getActiveRulesetUseCase.execute(seasonId);

    // Taxa de negociação (ver NegotiationWindow): só existe numa troca de
    // jogadores (os dois lados preenchidos) com a janela aberta tendo
    // feeEnabled = true. Compra/venda pura nunca paga essa taxa.
    const fee =
      outgoing && incoming && feeEnabled
        ? calculateDirectNegotiationFee(
            {
              proposingSquadId: negotiation.proposingSquadId,
              targetSquadId: negotiation.targetSquadId,
              outgoingPlayerOverall: outgoing.player.overall,
              incomingPlayerOverall: incoming.player.overall,
            },
            transferPricing.progressiveFeeBands,
          )
        : null;

    await this.ensureSufficientBalance(negotiation, fee);

    const coinTransactions = this.resolveCoinTransactions(negotiation, fee);
    const couponTransactions = await this.resolveCouponTransactions(
      negotiation,
      coupon.cap,
    );

    return this.negotiationsRepository.accept({
      seasonId,
      negotiationId,
      proposingTeamId: negotiation.proposingTeamId,
      proposingUserId: negotiation.proposingUserId,
      targetTeamId: negotiation.targetTeamId,
      outgoing,
      incoming,
      feeEnabled,
      coinTransactions,
      couponTransactions,
    });
  }

  // coinAmount livremente acordado (ver resolveNegotiationCoinTransactions)
  // + a taxa de negociação, quando existir — ambos no mesmo type (TRANSFER/
  // TRANSFER_FEE) usado pelo mercado tradicional, já que o ledger passou a
  // ser compartilhado (ver Transfer.originType).
  private resolveCoinTransactions(
    negotiation: NegotiationWithTeams,
    fee: DirectNegotiationFee | null,
  ): Array<{ squadId: string; type: CoinTransactionType; amount: number }> {
    const coinTransactions: Array<{
      squadId: string;
      type: CoinTransactionType;
      amount: number;
    }> = resolveNegotiationCoinTransactions(negotiation).map(
      ({ squadId, amount }) => ({ squadId, type: 'TRANSFER', amount }),
    );

    if (fee) {
      coinTransactions.push({
        squadId: fee.squadId,
        type: 'TRANSFER_FEE',
        amount: -fee.amount,
      });
    }

    return coinTransactions;
  }

  // Concede cupom só aos squads elegíveis (ver resolveNegotiationCouponRecipients)
  // que ainda não bateram o teto de acúmulo (seção 3 do regulamento) — o
  // cap-check acontece aqui, antes de chamar record(), que só grava o que
  // já foi decidido.
  private async resolveCouponTransactions(
    negotiation: NegotiationWithTeams,
    cap: number,
  ): Promise<Array<{ squadId: string; type: 'GRANTED'; amount: number }>> {
    const recipients = resolveNegotiationCouponRecipients(negotiation);
    const transactions: Array<{
      squadId: string;
      type: 'GRANTED';
      amount: number;
    }> = [];

    for (const squadId of recipients) {
      const canGrant = await this.transfersRepository.canGrantCoupon(
        squadId,
        cap,
      );
      if (canGrant) transactions.push({ squadId, type: 'GRANTED', amount: 1 });
    }

    return transactions;
  }

  // Soma, por squad, o que a negociação vai deduzir do ledger (coinAmount
  // acordado + taxa de negociação, quando existir) antes de gravar — os
  // dois podem recair sobre o mesmo squad.
  private async ensureSufficientBalance(
    negotiation: NegotiationWithTeams,
    fee: DirectNegotiationFee | null,
  ): Promise<void> {
    const deductions = new Map<string, number>();

    if (negotiation.coinAmount) {
      const payingSquadId =
        negotiation.coinAmount > 0
          ? negotiation.proposingSquadId
          : negotiation.targetSquadId;
      deductions.set(
        payingSquadId,
        (deductions.get(payingSquadId) ?? 0) + Math.abs(negotiation.coinAmount),
      );
    }

    if (fee) {
      deductions.set(
        fee.squadId,
        (deductions.get(fee.squadId) ?? 0) + fee.amount,
      );
    }

    for (const [squadId, amount] of deductions) {
      const balance =
        await this.negotiationsRepository.findSquadBalance(squadId);

      if (balance < amount)
        throw new ConflictException(
          'Saldo insuficiente para concluir essa negociação',
        );
    }
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
        'Negociações só são permitidas com a janela de negociação aberta',
      );

    return window.feeEnabled;
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
