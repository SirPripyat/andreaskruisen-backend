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
  outgoingPlayerId: null,
  incomingPlayerId: null,
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
      outgoingPlayerId: 'out-1',
      incomingPlayerId: 'in-1',
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
      outgoingPlayerId: 'out-1',
      incomingPlayerId: 'in-1',
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
      outgoingPlayerId: null,
      incomingPlayerId: 'in-1',
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
        outgoing: null,
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
      outgoingPlayerId: 'out-1',
      incomingPlayerId: null,
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
        incoming: null,
        couponTransactions: [
          { squadId: 'proposing-squad', type: 'GRANTED', amount: 1 },
        ],
      }),
    );
  });

  it('cupom respeitando o cap: squad que já está no teto não recebe novo lançamento', async () => {
    const negotiation = buildNegotiation({
      outgoingPlayerId: 'out-1',
      incomingPlayerId: 'in-1',
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
});
