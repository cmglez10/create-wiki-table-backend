import axios from "axios";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Results, ResultsData } from "./results";

const FUTBOL_REGIONAL_BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php";
const RESULTS_TABLE_URL = "com_calendario_tabla.php";


export class Scrap {
  async fetchLeague(competition: string, section: string): Promise<Team[]> {
    const html = await this.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${COMPETITION_URL}?com=${competition}&sec=${section}`);
    const league = new League(html);
    return league.getTeams(section);
  }

  async fetchPlayoff(competition: string): Promise<PlayoffRound[]> {
    const html = await this.getHtml(FUTBOL_REGIONAL_BASE_URL + COMPETITION_URL + competition);
    const playoffs = new Playoffs(html);
    return playoffs.getPlayoffs();
  }

  async fetchResults(federationId: string, groupId: string, year: string, section: string): Promise<ResultsData> {
    const html = await this.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${RESULTS_TABLE_URL}?va0=1&va1=${groupId}&va3=${federationId}&va4=${year}&va6=1000000&va7=${section}`);
    const  results = new Results(html, section);
    return results.getResults();
  }

  async getHtml(url: string): Promise<string> {
    const html = await axios(url);
    return html.data;
  }
}
