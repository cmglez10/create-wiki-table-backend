import Cheerio from "cheerio";
import { isFinite, last, split, toNumber, trim } from "lodash";
import { TeamInfo, Utils } from "./utils";

export interface Result {
  home: string;
  away: string;
}

export interface ResultsData {
  teams: Array<any>;
  results: Array<Array<Result>>;
}

export class Results {
  $: cheerio.Root;
 

  teamsInfo: Record<number, TeamInfo> = {};

  constructor(html: string) {
    this.$ = Cheerio.load(html);
    
  }

  async getResults(): Promise<ResultsData> {
    const rows: cheerio.Cheerio = this.$(
      "#competicion > #clasificaciones > .ronda_2, #competicion > #clasificaciones > .eliminatoria_uno, #competicion > #clasificaciones > .eliminatoria_resto, #competicion > #clasificaciones > .gol_vis_2"
    );
    return {
      teams: [],
      results: []
    }
   
  }

  
}
