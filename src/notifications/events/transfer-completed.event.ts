export const TRANSFER_COMPLETED_EVENT = 'transfer.completed';

export type TransferCompletedEvent = {
  seasonId: string;
  userId: string;
  transferId: string;
  outgoingPlayerName: string;
  incomingPlayerName: string;
  cost: number;
};
