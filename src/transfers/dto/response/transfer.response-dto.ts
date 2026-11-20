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
  // Nulo quando a movimentação nasceu de uma negociação direta sem esse
  // lado (compra/venda pura — ver Transfer.outgoing/incomingPlayerId).
  outgoingPlayer: TransferPlayerSummaryResponseDTO | null;
  outgoingTeam: TransferTeamSummaryResponseDTO;
  incomingPlayer: TransferPlayerSummaryResponseDTO | null;
  incomingTeam: TransferTeamSummaryResponseDTO;
  // Soma do(s) lançamento(s) de CoinTransaction ligados a essa movimentação
  // (ver TransfersRepository) — não recalculado a partir do overall, pra
  // não divergir se a fórmula de preço mudar depois.
  cost: number;
};
