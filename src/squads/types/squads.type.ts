import {
  Formation,
  PositionCode,
  PreferredFoot,
  Squad,
} from 'generated/prisma/client';

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
};

export type LineupOverview = {
  formation: Formation | null;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
};

export type RosterBySector = {
  goalkeepers: RosterPlayer[];
  defenders: RosterPlayer[];
  midfielders: RosterPlayer[];
  attackers: RosterPlayer[];
};

export type SquadWithRelations = Squad & {
  user: { id: string; name: string };
  team: {
    id: string;
    name: string;
    crestUrl: string;
    league: { id: string; name: string };
  };
};
