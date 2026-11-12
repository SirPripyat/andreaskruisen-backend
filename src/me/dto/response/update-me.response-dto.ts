import { User } from '../../../../generated/prisma/client';

export type UpdateMeResponseDTO = Pick<User, 'id' | 'name' | 'role'>;
