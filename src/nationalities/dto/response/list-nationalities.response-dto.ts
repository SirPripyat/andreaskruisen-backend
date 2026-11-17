import { Nationality } from '../../../../generated/prisma/client';
import { PaginatedResult } from '../../../commons/pagination';

export type ListNationalitiesResponseDTO = PaginatedResult<Nationality>;
