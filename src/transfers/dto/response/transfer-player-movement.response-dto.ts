import { User } from '../../../../generated/prisma/client';
import {
  TransferPlayerSummaryResponseDTO,
  TransferTeamSummaryResponseDTO,
} from './transfer.response-dto';

export type TransferPlayerMovementResponseDTO = {
  transferId: string;
  player: TransferPlayerSummaryResponseDTO;
  fromTeam: TransferTeamSummaryResponseDTO;
  toTeam: TransferTeamSummaryResponseDTO;
  requestedBy: Pick<User, 'id' | 'name'>;
  date: Date;
};
