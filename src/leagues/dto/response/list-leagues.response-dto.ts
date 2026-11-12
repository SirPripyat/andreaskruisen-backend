import { PaginatedResult } from 'src/commons/pagination';
import type { LeagueWithCountry } from 'src/leagues/types';

export type ListLeaguesResponseDTO = PaginatedResult<LeagueWithCountry>;
