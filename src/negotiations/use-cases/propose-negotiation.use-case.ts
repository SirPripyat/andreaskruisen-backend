import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Squad } from '../../../generated/prisma/client';
import { GetOpenNegotiationWindowUseCase } from '../../negotiation-window/use-cases';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { SquadsRepository } from '../../squads/squads.repository';
import {
  NegotiationClauseInputDTO,
  ProposeNegotiationRequestDTO,
} from '../dto';
import { NegotiationResponseDTO } from '../dto/response';
import { NegotiationsRepository } from '../negotiations.repository';
import { NegotiationAssignment, NegotiationClauseInput } from '../types';

@Injectable()
export class ProposeNegotiationUseCase {
  constructor(
    private readonly negotiationsRepository: NegotiationsRepository,
    private readonly seasonsRepository: SeasonsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly getOpenNegotiationWindowUseCase: GetOpenNegotiationWindowUseCase,
  ) {}

  async execute(
    seasonId: string,
    userId: string,
    dto: ProposeNegotiationRequestDTO,
  ): Promise<NegotiationResponseDTO> {
    await this.ensureSeasonExists(seasonId);
    await this.ensureNegotiationWindowOpen(seasonId);

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

    const outgoing = await this.getAssignmentsOrThrow(
      seasonId,
      dto.outgoingPlayerIds,
      proposingSquad.teamId,
      'que sai',
    );
    const incoming = await this.getAssignmentsOrThrow(
      seasonId,
      dto.incomingPlayerIds,
      targetSquad.teamId,
      'que entra',
    );

    const clauses = this.resolveClauses(dto.clauses, outgoing, incoming);

    return this.negotiationsRepository.create({
      seasonId,
      proposingSquadId: proposingSquad.id,
      targetSquadId: targetSquad.id,
      outgoingPlayerIds: outgoing.map((assignment) => assignment.player.id),
      incomingPlayerIds: incoming.map((assignment) => assignment.player.id),
      coinAmount: dto.coinAmount ?? null,
      clauses,
    });
  }

  // Cada cláusula precisa se referir a um dos jogadores já resolvidos da
  // negociação (ver seção 4 do regulamento) — sem isso, não dá pra saber de
  // qual time é o "ex-clube"/beneficiário da cláusula. Até 2 de cada lado
  // (troca multi-jogador, ver v1-transferencias.md), então até 4 no total.
  private resolveClauses(
    clauses: NegotiationClauseInputDTO[],
    outgoing: NegotiationAssignment[],
    incoming: NegotiationAssignment[],
  ): NegotiationClauseInput[] {
    const negotiatedPlayerIds = [...outgoing, ...incoming].map(
      (assignment) => assignment.player.id,
    );

    return clauses.map((clause) => {
      if (!negotiatedPlayerIds.includes(clause.playerId))
        throw new BadRequestException(
          'A cláusula precisa se referir a um dos jogadores da negociação',
        );

      return {
        type: clause.type,
        playerId: clause.playerId,
        amount: 'amount' in clause ? clause.amount : null,
        matchesCount: 'matchesCount' in clause ? clause.matchesCount : null,
        terms: clause.terms ?? null,
      };
    });
  }

  private async ensureSeasonExists(seasonId: string): Promise<void> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');
  }

  private async ensureNegotiationWindowOpen(seasonId: string): Promise<void> {
    const window = await this.getOpenNegotiationWindowUseCase.execute(seasonId);

    if (!window)
      throw new ConflictException(
        'Negociações só são permitidas com a janela de negociação aberta',
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

  private async getAssignmentsOrThrow(
    seasonId: string,
    playerIds: string[],
    expectedTeamId: string,
    label: string,
  ): Promise<NegotiationAssignment[]> {
    return Promise.all(
      playerIds.map(async (playerId) => {
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
      }),
    );
  }
}
