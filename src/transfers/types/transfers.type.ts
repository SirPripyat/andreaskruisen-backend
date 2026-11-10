import { PositionCode, Transfer } from '../../../generated/prisma/client';

export type TransferTeamSummary = {
  id: string;
  name: string;
  crestUrl: string;
};

export type TransferPlayerSummary = {
  id: string;
  name: string;
  photoUrl: string;
};

export type TransferAssignment = {
  player: TransferPlayerSummary;
  team: TransferTeamSummary;
  position: PositionCode;
};

export type TransferWithRelations = Transfer & {
  requestedBy: { id: string; name: string };
  outgoingPlayer: TransferPlayerSummary;
  outgoingTeam: TransferTeamSummary;
  incomingPlayer: TransferPlayerSummary;
  incomingTeam: TransferTeamSummary;
};

export type TransferPlayerMovement = {
  transferId: string;
  player: TransferPlayerSummary;
  fromTeam: TransferTeamSummary;
  toTeam: TransferTeamSummary;
  requestedBy: { id: string; name: string };
  date: Date;
};
