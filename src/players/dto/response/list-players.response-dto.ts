import { PaginatedResult } from 'src/commons/pagination';
import { PlayerListItem } from 'src/players/types';

export type ListPlayersResponseDTO = PaginatedResult<PlayerListItem>;
