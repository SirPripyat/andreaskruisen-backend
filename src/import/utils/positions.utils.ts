import { PlayerPositionInput } from '../../players/players.repository';
import { ScraperPlayer } from '../dto';

export const mapPositions = (player: ScraperPlayer): PlayerPositionInput[] => [
  { position: player.positionShort, isPrimary: true },
  ...player.alternatePositions.map((position) => ({
    position,
    isPrimary: false,
  })),
];

// Compara dois conjuntos de posições ignorando ordem — usado na importação
// pra só regravar quando o conjunto realmente mudou (ver
// ImportPlayersUseCase.persistPlayer).
export const arePositionsEqual = (
  a: PlayerPositionInput[],
  b: PlayerPositionInput[],
): boolean => {
  const normalize = (positions: PlayerPositionInput[]) =>
    [...positions]
      .map((position) => `${position.position}:${position.isPrimary}`)
      .sort()
      .join('|');

  return a.length === b.length && normalize(a) === normalize(b);
};
