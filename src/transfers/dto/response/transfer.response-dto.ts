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

// overall snapshotado no momento da movimentação (ver
// Transfer.outgoing/incomingPlayers) — não o overall atual do Player, que
// pode já ter sido atualizado pelo scraper.
export type TransferPlayerMovementSummaryResponseDTO =
  TransferPlayerSummaryResponseDTO & { overall: number };

export type TransferResponseDTO = Transfer & {
  requestedBy: Pick<User, 'id' | 'name'>;
  // Vazio quando a movimentação nasceu de uma negociação direta sem esse
  // lado (compra/venda pura) — 1 elemento no caso comum, até 2 no mercado
  // tradicional multi-jogador (ver v1-transferencias.md).
  outgoingPlayers: TransferPlayerMovementSummaryResponseDTO[];
  outgoingTeam: TransferTeamSummaryResponseDTO;
  incomingPlayers: TransferPlayerMovementSummaryResponseDTO[];
  incomingTeam: TransferTeamSummaryResponseDTO;
  // Soma do(s) lançamento(s) de CoinTransaction ligados a essa movimentação
  // (ver TransfersRepository) — não recalculado a partir do overall, pra
  // não divergir se a fórmula de preço mudar depois.
  cost: number;
};
