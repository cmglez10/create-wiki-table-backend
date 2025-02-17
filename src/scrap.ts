import axios from "axios";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Results, ResultsData } from "./results";

const FUTBOL_REGIONAL_BASE_URL = "https://www.futbol-regional.es/";
const COMPETITION_URL = "competicion.php";

export enum Origin {
  RFEF = "rfef",
  FRF = "frf",
}

const FEDERATION_BASE_URL = {
  [Origin.RFEF]: "https://resultados.rfef.es/pnfg/NPcd/NFG_VisTablaCruzada",
  [Origin.FRF]: "https://www.frfutbol.com/pnfg/NPcd/NFG_VisTablaCruzada",
};

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

  async fetchResults(origin: Origin, grupo: string): Promise<ResultsData> {
    console.log("fetchResults -> url", `${FEDERATION_BASE_URL[origin]}?cod_primaria=1000120&CodGrupo=${grupo}`);
    const html = await this.getHtml(`${FEDERATION_BASE_URL[origin]}?cod_primaria=1000120&CodGrupo=${grupo}`);
    const  results = new Results(html);
    return results.getResults();
  }

  async getHtml(url: string): Promise<string> {
    const html = await axios(url);
    return html.data;
  }
}
