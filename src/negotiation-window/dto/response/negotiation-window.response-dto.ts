import { NegotiationWindow, User } from '../../../../generated/prisma/client';

export type NegotiationWindowResponseDTO = NegotiationWindow & {
  openedBy: Pick<User, 'id' | 'name'>;
  closedBy: Pick<User, 'id' | 'name'> | null;
};

export type NegotiationWindowStatusResponseDTO = {
  open: NegotiationWindowResponseDTO | null;
  history: NegotiationWindowResponseDTO[];
};

export type NegotiationWindowIsOpenResponseDTO = {
  isOpen: boolean;
};
