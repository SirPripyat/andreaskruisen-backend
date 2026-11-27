import { ProgressiveFeeBand } from '../../../transfers/utils/transfer-pricing.utils';
import { calculateDirectNegotiationFee } from '../negotiation-fee.utils';

const BANDS: ProgressiveFeeBand[] = [
  { maxOverallDiff: 2, fee: 10 },
  { maxOverallDiff: 5, fee: 20 },
  { maxOverallDiff: 8, fee: 30 },
  { maxOverallDiff: null, fee: 50 },
];

describe('calculateDirectNegotiationFee', () => {
  it('cobra do proposingSquad quando o incoming é melhor que o outgoing', () => {
    const fee = calculateDirectNegotiationFee(
      {
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingOverallSum: 80,
        incomingOverallSum: 85,
      },
      BANDS,
    );

    expect(fee).toEqual({ squadId: 'proposing', amount: 20 });
  });

  it('cobra do targetSquad quando o outgoing é melhor que o incoming', () => {
    const fee = calculateDirectNegotiationFee(
      {
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingOverallSum: 90,
        incomingOverallSum: 85,
      },
      BANDS,
    );

    expect(fee).toEqual({ squadId: 'target', amount: 20 });
  });

  it('overall igual ainda cobra a taxa mínima, do targetSquad', () => {
    const fee = calculateDirectNegotiationFee(
      {
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingOverallSum: 85,
        incomingOverallSum: 85,
      },
      BANDS,
    );

    expect(fee).toEqual({ squadId: 'target', amount: 10 });
  });

  // Troca multi-jogador (ver v1-transferencias.md): a fórmula não muda, só
  // os overalls de entrada são somados antes de calcular a diferença.
  it('2 jogadores saem por 1 que entra: soma dos dois lados define quem paga', () => {
    const fee = calculateDirectNegotiationFee(
      {
        proposingSquadId: 'proposing',
        targetSquadId: 'target',
        outgoingOverallSum: 70 + 75,
        incomingOverallSum: 90,
      },
      BANDS,
    );

    expect(fee).toEqual({ squadId: 'target', amount: 50 });
  });
});
