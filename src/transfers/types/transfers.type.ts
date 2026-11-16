import { PositionCode } from '../../../generated/prisma/client';
import {
  TransferPlayerSummaryResponseDTO,
  TransferTeamSummaryResponseDTO,
} from '../dto/response';

export type TransferAssignment = {
  // overall à parte do resto do resumo do jogador: é o valor usado no
  // cálculo de preço, não necessariamente o que a API expõe pra listagem.
  player: TransferPlayerSummaryResponseDTO & { overall: number };
  team: TransferTeamSummaryResponseDTO;
  position: PositionCode;
};
