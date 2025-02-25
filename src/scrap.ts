import axios from "axios";
import Cheerio from "cheerio";
import { split } from "lodash";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Results, ResultsData } from "./results";

const FUTBOL_REGIONAL_BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php";
const RESULTS_TABLE_URL = "com_calendario_tabla.php";


export class Scrap {
  async fetchLeague(competition: string, section: string): Promise<Team[]> {
    const html = await this.getHtml(this.getCompetitionUrl(competition, section));
    const league = new League(html);
    return league.getTeams(section);
  }

  async fetchPlayoff(competition: string, section: string): Promise<PlayoffRound[]> {
    const html = await this.getHtml(this.getCompetitionUrl(competition, section));
    const playoffs = new Playoffs(html);
    return playoffs.getPlayoffs();
  }

  async fetchResults(competition: string, section: string): Promise<ResultsData> {
    const html = await this.getHtml(this.getCompetitionUrl(competition, section));
    const $ = Cheerio.load(html);
    const href = $('#post-clasificacion #menu_index:nth-of-type(3) a').attr('href');
    const url = split(href, "'")[1];

    const tableHtml = await this.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${url}`);
    const  results = new Results(tableHtml, section);
    return results.getResults();
  }

  async getHtml(url: string): Promise<string> {
    const html = await axios(url);
    return html.data;
  }

  getCompetitionUrl(competition: string, section: string): string {
    return `${FUTBOL_REGIONAL_BASE_URL}${COMPETITION_URL}?com=${competition}&sec=${section}`;
  }
}
