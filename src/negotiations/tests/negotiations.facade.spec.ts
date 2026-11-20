import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NEGOTIATION_ACCEPTED_EVENT,
  NEGOTIATION_PROPOSED_EVENT,
  NEGOTIATION_REJECTED_EVENT,
} from '../../notifications/events';
import { NegotiationsFacade } from '../negotiations.facade';
import {
  AcceptNegotiationUseCase,
  ListNegotiationsUseCase,
  ProposeNegotiationUseCase,
  RejectNegotiationUseCase,
} from '../use-cases';

const NEGOTIATION = {
  id: 'negotiation-1',
  proposingSquad: { user: { id: 'user-proposing' }, team: { name: 'Ajax' } },
  targetSquad: { user: { id: 'user-target' }, team: { name: 'Feyenoord' } },
};

const buildFacade = () => {
  const proposeNegotiationUseCase = {
    execute: jest.fn().mockResolvedValue(NEGOTIATION),
  } as unknown as ProposeNegotiationUseCase;
  const acceptNegotiationUseCase = {
    execute: jest.fn().mockResolvedValue(NEGOTIATION),
  } as unknown as AcceptNegotiationUseCase;
  const rejectNegotiationUseCase = {
    execute: jest.fn().mockResolvedValue(NEGOTIATION),
  } as unknown as RejectNegotiationUseCase;
  const listNegotiationsUseCase = {} as unknown as ListNegotiationsUseCase;
  const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

  const facade = new NegotiationsFacade(
    proposeNegotiationUseCase,
    acceptNegotiationUseCase,
    rejectNegotiationUseCase,
    listNegotiationsUseCase,
    eventEmitter,
  );

  return { facade, eventEmitter };
};

describe('NegotiationsFacade', () => {
  it('emite o evento de proposta pro dono do targetSquad', async () => {
    const { facade, eventEmitter } = buildFacade();

    await facade.propose('season-1', 'user-proposing', {
      targetTeamId: 'team-target',
      incomingPlayerId: 'player-in',
      clauses: [],
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith(NEGOTIATION_PROPOSED_EVENT, {
      seasonId: 'season-1',
      targetUserId: 'user-target',
      negotiationId: 'negotiation-1',
      proposingTeamName: 'Ajax',
    });
  });

  it('emite o evento de aceite pro dono do proposingSquad', async () => {
    const { facade, eventEmitter } = buildFacade();

    await facade.accept('season-1', 'user-target', 'negotiation-1');

    expect(eventEmitter.emit).toHaveBeenCalledWith(NEGOTIATION_ACCEPTED_EVENT, {
      seasonId: 'season-1',
      proposingUserId: 'user-proposing',
      negotiationId: 'negotiation-1',
      targetTeamName: 'Feyenoord',
    });
  });

  it('emite o evento de rejeição pro dono do proposingSquad', async () => {
    const { facade, eventEmitter } = buildFacade();

    await facade.reject('season-1', 'user-target', 'negotiation-1');

    expect(eventEmitter.emit).toHaveBeenCalledWith(NEGOTIATION_REJECTED_EVENT, {
      seasonId: 'season-1',
      proposingUserId: 'user-proposing',
      negotiationId: 'negotiation-1',
      targetTeamName: 'Feyenoord',
    });
  });
});
