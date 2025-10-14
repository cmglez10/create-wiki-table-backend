export interface LeagueTeam {
  teamInfo: TeamInfo;
  position: number;
  name: string;
  originalName: string;
  shield: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  sanction: number;
}

export interface TeamInfo {
  completeName: string;
  region: string;
  town: string;
  foundationYear: string;
  ground: string;
  coordinates?: Array<string>;
}

export interface Team {
  originalName: string;
  completeName: string;
  name: string;
  region: string;
  town: string;
  foundationYear: string;
  ground: string;
  shield?: string;
  coordinates?: Array<string>;
}
