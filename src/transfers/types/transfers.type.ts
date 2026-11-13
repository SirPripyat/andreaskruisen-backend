import { PositionCode } from '../../../generated/prisma/client';
import {
  TransferPlayerSummaryResponseDTO,
  TransferTeamSummaryResponseDTO,
} from '../dto/response';

export type TransferAssignment = {
  player: TransferPlayerSummaryResponseDTO;
  team: TransferTeamSummaryResponseDTO;
  position: PositionCode;
};
