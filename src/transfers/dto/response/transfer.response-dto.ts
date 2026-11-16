import {
  Player,
  Team,
  Transfer,
  User,
} from '../../../../generated/prisma/client';

export type TransferTeamSummaryResponseDTO = Pick<
  Team,
  'id' | 'name' | 'crestUrl'
>;

export type TransferPlayerSummaryResponseDTO = Pick<
  Player,
  'id' | 'name' | 'photoUrl'
>;

export type TransferResponseDTO = Transfer & {
  requestedBy: Pick<User, 'id' | 'name'>;
  outgoingPlayer: TransferPlayerSummaryResponseDTO;
  outgoingTeam: TransferTeamSummaryResponseDTO;
  incomingPlayer: TransferPlayerSummaryResponseDTO;
  incomingTeam: TransferTeamSummaryResponseDTO;
  // Valor da CoinTransaction ligada a essa transferência (ver
  // TransfersRepository) — não recalculado a partir do overall, pra não
  // divergir se a fórmula de preço mudar depois.
  cost: number;
};
