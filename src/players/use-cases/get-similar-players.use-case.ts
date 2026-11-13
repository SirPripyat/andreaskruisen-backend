import { Injectable, NotFoundException } from '@nestjs/common';
import { GetSimilarPlayersResponseDTO } from '../dto';
import { PlayersRepository } from '../players.repository';
import {
  computeSimilarity,
  GOALKEEPER_ATTRIBUTE_FIELDS,
  getPositionGroup,
  OUTFIELD_ATTRIBUTE_FIELDS,
  POSITION_GROUPS,
  toPlayerListItem,
} from '../utils';

@Injectable()
export class GetSimilarPlayersUseCase {
  constructor(private readonly playersRepository: PlayersRepository) {}

  async execute(
    seasonId: string,
    id: string,
    limit: number,
  ): Promise<GetSimilarPlayersResponseDTO> {
    const reference = await this.playersRepository.findByIdForSeason(
      seasonId,
      undefined,
      id,
    );
    const referenceAssignment = reference?.seasonAssignments[0];
    const referenceRating = reference?.ratings[0];
    const primaryPosition = reference?.positions.find(
      (position) => position.isPrimary,
    )?.position;

    if (
      !reference ||
      !referenceAssignment ||
      !referenceRating ||
      !primaryPosition
    ) {
      throw new NotFoundException('Jogador não encontrado nessa temporada');
    }

    const group = getPositionGroup(primaryPosition);
    const fields =
      group === 'GOALKEEPER'
        ? GOALKEEPER_ATTRIBUTE_FIELDS
        : OUTFIELD_ATTRIBUTE_FIELDS;

    const candidates =
      await this.playersRepository.findCandidatesForSimilarityInSeason(
        seasonId,
        id,
        POSITION_GROUPS[group],
      );

    const results = candidates
      .filter((assignment) => assignment.player.ratings[0])
      .map((assignment) => ({
        ...toPlayerListItem(assignment.player, assignment.team),
        similarity: computeSimilarity(
          referenceRating,
          assignment.player.ratings[0],
          { fields },
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      reference: toPlayerListItem(reference, referenceAssignment.team),
      results,
    };
  }
}
