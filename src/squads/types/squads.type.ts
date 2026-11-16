import {
  Formation,
  League,
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
