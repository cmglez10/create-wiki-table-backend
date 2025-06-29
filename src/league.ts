import Cheerio from "cheerio";
import { TeamInfo, TeamInfoRequestOptions, Utils } from "./utils";

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

export class League {
  $: cheerio.Root;

  constructor(html: string) {
    this.$ = Cheerio.load(html);
  }

  async getTeams(options: TeamInfoRequestOptions = { region: false, coordinates: false } ): Promise<LeagueTeam[]> {
    const teams: LeagueTeam[] = [];
    const rows: cheerio.Cheerio = this.$("#clasificacion1 .tablagen .fila");

    for (let i = 0; i < rows.length; i++) {
      const team: LeagueTeam = {
        teamInfo: await this.getTeamInfo(rows[i], options),
        position: Number(this.getColumn(rows[i], 2)),
        name: this.getName(rows[i]),
        originalName: this.getColumn(rows[i], 3),
        shield: this.getShieldUrl(rows[i]),
        points: Number(this.getColumn(rows[i], 6)),
        played: Number(this.getColumn(rows[i], 7)),
        won: Number(this.getColumn(rows[i], 8)),
        drawn: Number(this.getColumn(rows[i], 9)),
        lost: Number(this.getColumn(rows[i], 10)),
        gf: Number(this.getColumn(rows[i], 11)),
        ga: Number(this.getColumn(rows[i], 12)),
        gd: Number(this.getColumn(rows[i], 13)),
        sanction: Number(this.getColumn(rows[i], 14)),
      };

      teams.push(team);
    }

    return teams;
  }

  getColumn(row: cheerio.Element, columnIndex: number): string {
    return this.$(this.$(row).children()[columnIndex]).text().trim();
  }

  getShieldUrl(row: cheerio.Element): string {
    return (
      Utils.getBaseUrl() +
      this.$(this.$(row).find("#popupimagen img")).attr("src")
    );
  }

  getUrl(row: cheerio.Element): string {
    return this.$(this.$(row).children()[2]).find("a").attr("href");
  }

  getName(row: cheerio.Element): string {
    const name = this.getColumn(row, 3);

    return Utils.normalizeName(name);
  }

  async getTeamInfo(row: cheerio.Element, options: TeamInfoRequestOptions = { region: false, coordinates: false } ): Promise<TeamInfo> {
    const teamUrl = this.$(this.$(row).children()[3]).find("a").attr("href");
    return Utils.getTeamInfo(teamUrl, options);
  }
}
