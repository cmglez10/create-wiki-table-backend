import Cheerio from "cheerio";
import axios from "axios";

const BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php?";

export interface Team {
  position: number;
  name: string;
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
    this.getTeams();
    return this.teams;
  }

  getTeams() {
    this.teams = [];
    const rows: cheerio.Cheerio = this.$("#clasificacion1 .tablagen .fila");

    console.log(rows);

    for (let i = 0; i < rows.length; i++) {
      const team: Team = {
        position: Number(this.getColumn(rows[i], 2)),
        name: this.getColumn(rows[i], 3),
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
}
