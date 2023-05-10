import axios from "axios";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";

const BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php?";

export class Scrap {
  async fetchLeague(competition: string): Promise<Team[]> {
    const html = await this.getHtml(BASE_URL + COMPETITION_URL + competition);
    const league = new League(html);
    return league.getTeams();
  }

  async fetchPlayoff(competition: string): Promise<PlayoffRound[]> {
    const html = await this.getHtml(BASE_URL + COMPETITION_URL + competition);
    const playoffs = new Playoffs(html);
    return playoffs.getPlayoffs();
  }

  async getHtml(url: string): Promise<string> {
    const html = await axios(url);
    return html.data;
  }
}
