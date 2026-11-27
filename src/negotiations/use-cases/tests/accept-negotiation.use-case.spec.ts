import { GetOpenNegotiationWindowUseCase } from '../../../negotiation-window/use-cases';
import { RulesetPayload } from '../../../rulesets/schemas/ruleset-payload.schema';
import { GetActiveRulesetUseCase } from '../../../rulesets/use-cases';
import { SeasonsRepository } from '../../../seasons/seasons.repository';
import { SquadsRepository } from '../../../squads/squads.repository';
import { TransfersRepository } from '../../../transfers/transfers.repository';
import { NegotiationsRepository } from '../../negotiations.repository';
import { NegotiationAssignment, NegotiationWithTeams } from '../../types';
import { AcceptNegotiationUseCase } from '../accept-negotiation.use-case';

// @Transactional() exige um TransactionHost real (ClsPluginTransactional),
// que só existe num bootstrap completo do Nest — nenhum outro use-case
// decorado assim tem spec unitário neste repo. Aqui só testamos a lógica de
// negócio de resolução de lançamentos, então o decorator vira um no-op
// (jest.mock é içado pelo babel-jest antes dos imports acima rodarem).
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const PROGRESSIVE_FEE_BANDS = [
  { maxOverallDiff: 2, fee: 10 },
  { maxOverallDiff: null, fee: 20 },
];

const RULESET: RulesetPayload = {
  prizes: {
    matchResult: { win: 3, draw: 1, loss: 0 },
    groupPositionAmounts: [1],
    phaseAdvance: 0,
    champion: 0,
    runnerUp: 0,
  },
  transferPricing: {
    coinsPerOverallPoint: 1,
    progressiveFeeBands: PROGRESSIVE_FEE_BANDS,
  },
  initialBalance: { baseOverall: 70 },
  coupon: { cap: 1 },
};

const buildAssignment = (
  playerId: string,
  teamId: string,
  overall: number,
): NegotiationAssignment => ({
  player: { id: playerId, name: playerId, photoUrl: null, overall },
  team: { id: teamId, name: teamId, crestUrl: null },
  position: 'ATA',
});

const buildNegotiation = (
  overrides: Partial<NegotiationWithTeams> = {},
): NegotiationWithTeams => ({
  id: 'negotiation-1',
  seasonId: 'season-1',
  status: 'PENDING',
  proposingSquadId: 'proposing-squad',
  proposingTeamId: 'proposing-team',
  proposingUserId: 'proposing-user',
  targetSquadId: 'target-squad',
  targetTeamId: 'target-team',
  outgoingPlayerIds: [],
  incomingPlayerIds: [],
  coinAmount: null,
  ...overrides,
});

const buildUseCase = (options: {
  negotiation: NegotiationWithTeams;
  feeEnabled: boolean;
  squadBalance?: number;
  grantableSquadIds?: string[];
}) => {
  const { negotiation, feeEnabled, squadBalance = 1000 } = options;
  const grantableSquadIds = new Set(
    options.grantableSquadIds ?? [
      negotiation.proposingSquadId,
      negotiation.targetSquadId,
    ],
  );

  const negotiationsRepository = {
    findByIdWithTeams: jest.fn().mockResolvedValue(negotiation),
    findAssignment: jest.fn(),
    findSquadBalance: jest.fn().mockResolvedValue(squadBalance),
    accept: jest.fn().mockResolvedValue({}),
  } as unknown as NegotiationsRepository;

  const transfersRepository = {
    canGrantCoupon: jest.fn((squadId: string) =>
      Promise.resolve(grantableSquadIds.has(squadId)),
    ),
  } as unknown as TransfersRepository;

  const seasonsRepository = {
    findById: jest.fn().mockResolvedValue({ id: negotiation.seasonId }),
  } as unknown as SeasonsRepository;

  const squadsRepository = {
    findByUserAndSeason: jest
      .fn()
      .mockResolvedValue({ id: negotiation.targetSquadId }),
  } as unknown as SquadsRepository;

  const getActiveRulesetUseCase = {
    execute: jest.fn().mockResolvedValue(RULESET),
  } as unknown as GetActiveRulesetUseCase;

  const getOpenNegotiationWindowUseCase = {
    execute: jest.fn().mockResolvedValue({ feeEnabled }),
  } as unknown as GetOpenNegotiationWindowUseCase;

  const useCase = new AcceptNegotiationUseCase(
    negotiationsRepository,
    transfersRepository,
    seasonsRepository,
    squadsRepository,
    getActiveRulesetUseCase,
    getOpenNegotiationWindowUseCase,
  );

  return { useCase, negotiationsRepository, transfersRepository };
};

describe('AcceptNegotiationUseCase', () => {
  it('troca com taxa: lança TRANSFER dos dois lados e TRANSFER_FEE de quem recebe o jogador melhor', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerIds: ['out-1'],
      incomingPlayerIds: ['in-1'],
      coinAmount: 20,
    });
    const { useCase, negotiationsRepository } = buildUseCase({
      negotiation,
      feeEnabled: true,
    });
    negotiationsRepository.findAssignment = jest
      .fn()
      .mockImplementation((_seasonId: string, playerId: string) =>
        playerId === 'out-1'
          ? buildAssignment('out-1', negotiation.proposingTeamId, 78)
          : buildAssignment('in-1', negotiation.targetTeamId, 82),
      );

    await useCase.execute(negotiation.seasonId, 'user-1', negotiation.id);

    expect(negotiationsRepository.accept).toHaveBeenCalledWith(
      expect.objectContaining({
        coinTransactions: [
          { squadId: 'proposing-squad', type: 'TRANSFER', amount: -20 },
          { squadId: 'target-squad', type: 'TRANSFER', amount: 20 },
          { squadId: 'proposing-squad', type: 'TRANSFER_FEE', amount: -20 },
        ],
        couponTransactions: [
          { squadId: 'proposing-squad', type: 'GRANTED', amount: 1 },
          { squadId: 'target-squad', type: 'GRANTED', amount: 1 },
        ],
        feeEnabled: true,
      }),
    );
  });

  it('troca sem taxa: janela com feeEnabled=false não gera TRANSFER_FEE', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerIds: ['out-1'],
      incomingPlayerIds: ['in-1'],
      coinAmount: null,
    });
    const { useCase, negotiationsRepository } = buildUseCase({
      negotiation,
      feeEnabled: false,
    });
    negotiationsRepository.findAssignment = jest
      .fn()
      .mockImplementation((_seasonId: string, playerId: string) =>
        playerId === 'out-1'
          ? buildAssignment('out-1', negotiation.proposingTeamId, 78)
          : buildAssignment('in-1', negotiation.targetTeamId, 82),
      );

    await useCase.execute(negotiation.seasonId, 'user-1', negotiation.id);

    expect(negotiationsRepository.accept).toHaveBeenCalledWith(
      expect.objectContaining({
        coinTransactions: [],
        feeEnabled: false,
      }),
    );
  });

  it('compra pura: só o squad vendedor (incoming) recebe cupom, sem taxa de negociação', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerIds: [],
      incomingPlayerIds: ['in-1'],
      coinAmount: 15,
    });
    const { useCase, negotiationsRepository } = buildUseCase({
      negotiation,
      feeEnabled: true,
    });
    negotiationsRepository.findAssignment = jest
      .fn()
      .mockResolvedValue(buildAssignment('in-1', negotiation.targetTeamId, 82));

    await useCase.execute(negotiation.seasonId, 'user-1', negotiation.id);

    expect(negotiationsRepository.accept).toHaveBeenCalledWith(
      expect.objectContaining({
        outgoing: [],
        coinTransactions: [
          { squadId: 'proposing-squad', type: 'TRANSFER', amount: -15 },
          { squadId: 'target-squad', type: 'TRANSFER', amount: 15 },
        ],
        couponTransactions: [
          { squadId: 'target-squad', type: 'GRANTED', amount: 1 },
        ],
      }),
    );
  });

  it('venda pura: só o squad vendedor (outgoing) recebe cupom', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerIds: ['out-1'],
      incomingPlayerIds: [],
      coinAmount: -15,
    });
    const { useCase, negotiationsRepository } = buildUseCase({
      negotiation,
      feeEnabled: true,
    });
    negotiationsRepository.findAssignment = jest
      .fn()
      .mockResolvedValue(
        buildAssignment('out-1', negotiation.proposingTeamId, 78),
      );

    await useCase.execute(negotiation.seasonId, 'user-1', negotiation.id);

    expect(negotiationsRepository.accept).toHaveBeenCalledWith(
      expect.objectContaining({
        incoming: [],
        couponTransactions: [
          { squadId: 'proposing-squad', type: 'GRANTED', amount: 1 },
        ],
      }),
    );
  });

  it('cupom respeitando o cap: squad que já está no teto não recebe novo lançamento', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerIds: ['out-1'],
      incomingPlayerIds: ['in-1'],
      coinAmount: null,
    });
    const { useCase, negotiationsRepository } = buildUseCase({
      negotiation,
      feeEnabled: false,
      grantableSquadIds: ['target-squad'],
    });
    negotiationsRepository.findAssignment = jest
      .fn()
      .mockImplementation((_seasonId: string, playerId: string) =>
        playerId === 'out-1'
          ? buildAssignment('out-1', negotiation.proposingTeamId, 78)
          : buildAssignment('in-1', negotiation.targetTeamId, 82),
      );

    await useCase.execute(negotiation.seasonId, 'user-1', negotiation.id);

    expect(negotiationsRepository.accept).toHaveBeenCalledWith(
      expect.objectContaining({
        couponTransactions: [
          { squadId: 'target-squad', type: 'GRANTED', amount: 1 },
        ],
      }),
    );
  });

  // Troca multi-jogador (ver v1-transferencias.md): mesma regra do
  // mercado tradicional, estendida pra negociação direta.
  it('troca multi-jogador: 2 jogadores saem por 1 que entra, taxa calculada pela soma dos overalls', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerIds: ['out-1', 'out-2'],
      incomingPlayerIds: ['in-1'],
      coinAmount: null,
    });
    const { useCase, negotiationsRepository } = buildUseCase({
      negotiation,
      feeEnabled: true,
    });
    negotiationsRepository.findAssignment = jest
      .fn()
      .mockImplementation((_seasonId: string, playerId: string) => {
        if (playerId === 'out-1')
          return buildAssignment('out-1', negotiation.proposingTeamId, 70);
        if (playerId === 'out-2')
          return buildAssignment('out-2', negotiation.proposingTeamId, 75);
        return buildAssignment('in-1', negotiation.targetTeamId, 90);
      });

    await useCase.execute(negotiation.seasonId, 'user-1', negotiation.id);

    // sai 70 + 75 (soma 145), entra 90 -> diff = 90 - 145 = -55 -> target
    // paga a taxa (quem recebe o jogador melhor, aqui o proposing, com
    // diff negativo significa que o target recebeu "pior" soma... a regra
    // é: diff > 0 quem paga é o proposing; diff <= 0 quem paga é o target).
    expect(negotiationsRepository.accept).toHaveBeenCalledWith(
      expect.objectContaining({
        outgoing: [
          expect.objectContaining({
            player: expect.objectContaining({ id: 'out-1' }),
          }),
          expect.objectContaining({
            player: expect.objectContaining({ id: 'out-2' }),
          }),
        ],
        incoming: [
          expect.objectContaining({
            player: expect.objectContaining({ id: 'in-1' }),
          }),
        ],
        coinTransactions: [
          { squadId: 'target-squad', type: 'TRANSFER_FEE', amount: -20 },
        ],
      }),
    );
  });
});
