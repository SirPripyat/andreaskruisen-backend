import { AuthenticatedUser } from 'src/auth/auth.service';

export type GetMeResponseDTO = AuthenticatedUser & { teamId: string | null };
