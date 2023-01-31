import Cheerio from "cheerio";
import axios from "axios";
import { replace, trim, split } from "lodash";

const BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php?";

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

export class Scrap {
  $: cheerio.Root;
  teams: Team[] = [];

  async fetch(competition: string) {
    const html = await axios(BASE_URL + COMPETITION_URL + competition);
    this.$ = Cheerio.load(await html.data);
    await this.getTeams();
    return this.teams;
  }

  async getTeams() {
    this.teams = [];
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

      this.teams.push(team);
    }
  }

  getColumn(row: cheerio.Element, columnIndex: number): string {
    return this.$(this.$(row).children()[columnIndex]).text();
  }

  getShieldUrl(row: cheerio.Element): string {
    return BASE_URL + this.$(this.$(row).find("#popupimagen img")).attr("src");
  }

  getName(row: cheerio.Element): string {
    const name = this.getColumn(row, 3);

    return trim(replace(name, new RegExp("\\.", "g"), ". "));
  }

  async getCompleteName(row: cheerio.Element): Promise<string> {
    const teamUrl = this.$(this.$(row).children()[3]).find("a").attr("href");
    const html = await axios(BASE_URL + teamUrl);
    const team$ = Cheerio.load(await html.data);
    const cName = split(team$("#derecha_sup_equ").text(), " :: ")[1];
    return cName;
  }
}
