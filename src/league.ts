import Cheerio from "cheerio";
import { Utils } from "./utils";

export interface Team {
  position: number;
  name: string;
  completeName: string;
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

  async getTeams() {
    const teams: Team[] = [];
    const rows: cheerio.Cheerio = this.$("#clasificacion1 .tablagen .fila");

    for (let i = 0; i < rows.length; i++) {
      const team: Team = {
        position: Number(this.getColumn(rows[i], 2)),
        name: this.getName(rows[i]),
        completeName: await this.getCompleteName(rows[i]),
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
    return this.$(this.$(row).children()[columnIndex]).text();
  }

  getShieldUrl(row: cheerio.Element): string {
    return (
      Utils.getBaseUrl() +
      this.$(this.$(row).find("#popupimagen img")).attr("src")
    );
  }

  getName(row: cheerio.Element): string {
    const name = this.getColumn(row, 3);

    return Utils.normalizeName(name);
  }

  async getCompleteName(row: cheerio.Element): Promise<string> {
    const teamUrl = this.$(this.$(row).children()[3]).find("a").attr("href");
    return (await Utils.getTeamInfo(teamUrl)).completeName;
  }
}
