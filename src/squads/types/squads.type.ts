import {
  CoinTransactionType,
  Formation,
  League,
  Phase,
  PositionCode,
  PreferredFoot,
  SofifaPositionCode,
  Squad,
  Team,
  User,
} from 'generated/prisma/client';

export type RosterPlayerPositionRating = {
  position: SofifaPositionCode;
  overall: number;
};

export type RosterPlayerPosition = {
  position: PositionCode;
  isPrimary: boolean;
};

export type RosterPlayer = {
  id: string;
  name: string;
  photoUrl: string;
  birthdate: Date;
  position: PositionCode;
  overallRating: number;
  preferredFoot: PreferredFoot;
  nationality: { id: string; name: string; flagUrl: string };
  isStarter: boolean;
  // Todas as posições que o jogador pode jogar (ver model PlayerPosition),
  // não só a que está ocupando no momento (`position`, acima).
  positions: RosterPlayerPosition[];
  // Overall na posição que ocupa no momento (slot do campo pra titular,
  // posição primária pro reserva) vem do front, calculado em cima disso —
  // ver findLineupOverview/findRoster. Grid completo (27 posições do
  // SoFIFA) porque PositionCode (12) é um subconjunto exato dela, então o
  // front casa pelo código sem precisar de mapeamento.
  positionRatings: RosterPlayerPositionRating[];
};

export type LineupOverview = {
  formation: Formation | null;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
};

export type LineupSlotAssignment = {
  teamId: string;
  isStarter: boolean;
  lineupPosition: PositionCode | null;
};

export type RosterBySector = {
  goalkeepers: RosterPlayer[];
  defenders: RosterPlayer[];
  midfielders: RosterPlayer[];
  attackers: RosterPlayer[];
};

export type SquadWithRelations = Squad & {
  user: Pick<User, 'id' | 'name'>;
  team: Pick<Team, 'id' | 'name' | 'crestUrl'> & {
    league: Pick<League, 'id' | 'name'>;
  };
};

// Um lançamento do ledger de moedas (ver model CoinTransaction) já resolvido
// pra exibição: `match`/`phase` só vêm preenchidos quando o lançamento tem
// essa origem (ver comentários do model), e `match.opponentTeam` já é o lado
// contrário ao time cujo extrato está sendo listado — o front não precisa
// saber se o time era home ou away pra montar "vitória contra Ajax".
export type SquadCoinTransaction = {
  id: string;
  type: CoinTransactionType;
  amount: number;
  createdAt: Date;
  match: {
    id: string;
    // null = bye (ver buildGroupStageQualifiersBracket) — hoje nunca
    // acontece de verdade, já que nenhum prêmio é dado a uma partida de
    // bye, mas o tipo do Match permite null.
    opponentTeam: Pick<Team, 'id' | 'name' | 'crestUrl'> | null;
  } | null;
  phase: Pick<Phase, 'id' | 'name'> | null;
  transferId: string | null;
};
