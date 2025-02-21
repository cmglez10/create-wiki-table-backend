import Cheerio from "cheerio";
import { filter, includes, map, split, toInteger, trim } from "lodash";
import { TeamInfo, Utils } from "./utils";


export interface Result {
  home: number;
  away: number;
}

export interface RecordResult {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  result: Result;
  goals: number;
}

interface Records {
  biggestHomeWin: RecordResult;
  biggestAwayWin: RecordResult;
  moreGoalsMatch: RecordResult;
}

export interface ResultsData {
  teams: Array<TeamInfo>;
  results: Array<Array<Result>>;
  records: Records;
}

export class Results {
  $: cheerio.Root;
  section: string;
 
  constructor(html: string, section: string) {
    this.$ = Cheerio.load(html);
    this.section = section;
  }

  async getResults(): Promise<ResultsData> {
    const rows: cheerio.Cheerio = this.$(
      "#calendario > div > div"
    );

    const teams = await this.getTeams(rows);
    const results = await this.getResultsArray(rows);
    const records = this.getRecords(results, teams);

    return {
      teams,
      results,
      records,
    }
  }

  async getTeams(rows: cheerio.Cheerio): Promise<Array<TeamInfo>> {
    const firstRow = rows.first();

    const columns = firstRow.find("div");

    const filteredColumns = filter(columns, (column, index) => {
      return index > 1;
    });

    const teamsPromises = map(filteredColumns, (column) => {
      return this.getTeamInfo(this.$(column).find("a"));
    });

    return Promise.all(teamsPromises);
  }

  async getTeamInfo(teamLink: cheerio.Cheerio): Promise<TeamInfo> {
    const teamUrl = teamLink.attr("href");
    const teamId: number = parseInt(trim(split(teamUrl, "?")[1]));

    if (!teamId) {
      return {
        completeName: "",
        flag: "",
      };
    }

    return  Utils.getTeamInfo(teamId, this.section);
  }
  

  async getResultsArray(rows: cheerio.Cheerio): Promise<Array<Array<Result>>> {
    const results: Array<Array<Result>> = [];

    rows.each((i, row) => {
      if (i < 2) return;

      const rowColumns = this.$(row).find("div");

      const rowResults: Array<Result> = [];

      rowColumns.each((j, column) => {
        if (j < 2) return;

        const result = this.$(column).text();

        if (result && includes(result, "-")) {
          const [home, away] = split(result, "-");
          rowResults.push({ home: toInteger(trim(home)), away: toInteger(trim(away)) });
        } else {
          rowResults.push(null);
        }
      });
          

      results.push(rowResults);
    });

    return results;
  }
  
  getRecords(results: Array<Array<Result>>, teams: Array<TeamInfo>): Records {
    let biggestHomeWin: RecordResult = null;
    let biggestAwayWin: RecordResult = null;
    let moreGoalsMatch: RecordResult = null;
    
    for (let i = 0; i < results.length; i++) {
      for(let j = 0; j < results[i].length; j++) {
        const result = results[i][j];
        if (result === null) continue;
        const goalDifference = result.home - result.away;

        if (goalDifference > 0 && (!biggestHomeWin || goalDifference > biggestHomeWin.goals)) {
          biggestHomeWin = {
            homeTeam: teams[i],
            awayTeam: teams[j],
            result,
            goals: goalDifference,
          };
        }

        if (goalDifference < 0 && (!biggestAwayWin || Math.abs(goalDifference) > biggestAwayWin.goals)) {
          biggestAwayWin = {
            homeTeam: teams[i],
            awayTeam: teams[j],
            result,
            goals: Math.abs(goalDifference),
          };
        }

        if (!moreGoalsMatch || result.home + result.away > moreGoalsMatch.goals) {
          moreGoalsMatch = {
            homeTeam: teams[i],
            awayTeam: teams[j],
            result,
            goals: result.home + result.away,
          };
        }
      }
    }

    return {
      biggestHomeWin,
      biggestAwayWin,
      moreGoalsMatch,
    };
  }
}
