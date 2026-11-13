import { PaginatedResult } from 'src/commons/pagination';
import { PlayerSearchItem } from 'src/players/types';

export type ListPlayersForSeasonResponseDTO = PaginatedResult<PlayerSearchItem>;
