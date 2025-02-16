import axios from "axios";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Results, ResultsData } from "./results";

const BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php";

export class Scrap {
  async fetchLeague(competition: string, section: string): Promise<Team[]> {
    const html = await this.getHtml(`${BASE_URL}${COMPETITION_URL}?com=${competition}&sec=${section}`);
    const league = new League(html);
    return league.getTeams(section);
  }

  async fetchPlayoff(competition: string): Promise<PlayoffRound[]> {
    const html = await this.getHtml(BASE_URL + COMPETITION_URL + competition);
    const playoffs = new Playoffs(html);
    return playoffs.getPlayoffs();
  }

  async fetchResults(url: string): Promise<ResultsData> {
    const html = await this.getHtml(url);
    const  results = new Results(html);
    return results.getResults();
  }

  async getHtml(url: string): Promise<string> {
    const html = await axios(url);
    return html.data;
  }
}
