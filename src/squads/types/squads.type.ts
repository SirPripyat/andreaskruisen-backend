import {
  Formation,
  League,
  PositionCode,
  PreferredFoot,
  Squad,
  Team,
  User,
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
