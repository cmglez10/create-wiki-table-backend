import Cheerio from "cheerio";
import { LeagueTeam, TeamInfo } from "../interfaces/team.interface";
import { FreUtils, TeamInfoRequestOptions } from "./utils";

export class League {
  $: cheerio.Root;

  constructor(html: string) {
    this.$ = Cheerio.load(html);
  }

  async getTeams(
    options: TeamInfoRequestOptions = { region: false, coordinates: false }
  ): Promise<LeagueTeam[]> {
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
      FreUtils.getBaseUrl() +
      this.$(this.$(row).find("#popupimagen img")).attr("src")
    );
  }

  getUrl(row: cheerio.Element): string {
    return this.$(this.$(row).children()[2]).find("a").attr("href");
  }

  getName(row: cheerio.Element): string {
    const name = this.getColumn(row, 3);

    return FreUtils.normalizeName(name);
  }

  async getTeamInfo(
    row: cheerio.Element,
    options: TeamInfoRequestOptions = { region: false, coordinates: false }
  ): Promise<TeamInfo> {
    const teamUrl = this.$(this.$(row).children()[3]).find("a").attr("href");
    return FreUtils.getTeamInfo(teamUrl, options);
  }
}
