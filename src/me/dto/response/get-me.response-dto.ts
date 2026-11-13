import { AuthenticatedUser } from 'src/auth/auth.service';

export type GetMeResponseDTO = AuthenticatedUser & {
  seasonId: string | null;
  teamId: string | null;
};
