import { AuthenticatedUser } from '../../types';

// Resposta HTTP de POST /auth/login — não inclui expiresAt (fica só no
// retorno interno de LoginUseCase, pra quem precisar no futuro).
export type LoginResponseDTO = {
  user: AuthenticatedUser;
  token: string;
};
