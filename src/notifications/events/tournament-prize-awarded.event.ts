import { ClsService } from 'nestjs-cls';
import { TournamentPrizeType } from '../../tournaments/types';

export const TOURNAMENT_PRIZE_AWARDED_EVENT = 'tournament.prize-awarded';

export type TournamentPrizeAwardedEvent = {
  seasonId: string;
  squadId: string;
  amount: number;
  type: TournamentPrizeType;
  phaseId?: string;
  matchId?: string;
};

// AwardTournamentPrizeUseCase roda dentro da transação de quem o chama
// (AdvancePhaseUseCase, ReplaceMatchGoalsUseCase — às vezes várias vezes
// numa mesma transação). Emitir o evento ali dentro arriscaria notificar um
// prêmio que acaba sendo desfeito se um passo posterior da mesma transação
// falhar. Por isso só empilha no CLS (mesmo contexto da requisição, fora do
// tempo de vida da transação) e quem chamou o use-case esvazia a fila e
// emite de fato só depois que o `await` confirma que a transação comitou.
const PENDING_EVENTS_KEY = 'pendingTournamentPrizeEvents';

export const queuePendingTournamentPrizeEvent = (
  cls: ClsService,
  event: TournamentPrizeAwardedEvent,
): void => {
  const pending =
    cls.get<TournamentPrizeAwardedEvent[]>(PENDING_EVENTS_KEY) ?? [];
  cls.set(PENDING_EVENTS_KEY, [...pending, event]);
};

export const flushPendingTournamentPrizeEvents = (
  cls: ClsService,
): TournamentPrizeAwardedEvent[] => {
  const pending =
    cls.get<TournamentPrizeAwardedEvent[]>(PENDING_EVENTS_KEY) ?? [];
  cls.set(PENDING_EVENTS_KEY, []);
  return pending;
};
