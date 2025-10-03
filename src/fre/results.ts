import Cheerio from "cheerio";
import { includes, split, toInteger, trim } from "lodash";
import { FreUtils, Team } from "./utils";

export interface Result {
  home: number;
  away: number;
}

export interface RecordResult {
  homeTeam: Team;
  awayTeam: Team;
  result: Result;
  goals: number;
  date: string;
  matchday: number;
  groupId: number;
}

export interface Records {
  biggestHomeWin: Array<RecordResult>;
  biggestAwayWin: Array<RecordResult>;
  moreGoalsMatch: Array<RecordResult>;
}

export interface ResultsData {
  teams: Array<Team>;
  results: Array<Array<Result>>;
  records: Records;
}

export class FreResults {
  crossTable$: cheerio.Root;
  teamCalendarIndex$: cheerio.Root;

  constructor(
    crossTableHtml: string,
    teamCalendarIndexHtml: string,
    private _section: string,
    private _groupId: number
  ) {
    this.crossTable$ = Cheerio.load(crossTableHtml);
    this.teamCalendarIndex$ = Cheerio.load(teamCalendarIndexHtml);
  }

  async getResults(): Promise<ResultsData> {
    const rows: cheerio.Cheerio = this.crossTable$("#calendario > div > div");

    const teams = await this.getTeams(rows);
    const results = await this.getResultsArray(rows);
    const records = await this.getRecords(results, teams);

    return {
      teams,
      results,
      records,
    };
  }

  async getTeams(rows: cheerio.Cheerio): Promise<Array<Team>> {
    const results: Array<Team> = [];

    for (let i = 2; i < rows.length; i++) {
      const row = rows.get(i);
      const columns = this.crossTable$(row).find("div");

      results.push(
        await this.getTeamInfo(this.crossTable$(columns).first().find("a"))
      );
    }

    return results;
  }

  async getTeamInfo(teamLink: cheerio.Cheerio): Promise<Team> {
    const teamName = teamLink.text().trim();
    const teamUrl = teamLink.attr("href");

    return {
      ...(await FreUtils.getTeamInfo(teamUrl)),
      originalName: teamName,
      name: FreUtils.normalizeName(teamName),
    };
  }

  async getResultsArray(rows: cheerio.Cheerio): Promise<Array<Array<Result>>> {
    const results: Array<Array<Result>> = [];

    rows.each((i, row) => {
      if (i < 2) return;

      const rowColumns = this.crossTable$(row).find("div");

      const rowResults: Array<Result> = [];

      rowColumns.each((j, column) => {
        if (j < 2) return;

        const result = this.crossTable$(column).text();

        if (result && includes(result, "-")) {
          const [home, away] = split(result, "-");
          rowResults.push({
            home: toInteger(trim(home)),
            away: toInteger(trim(away)),
          });
        } else {
          rowResults.push(null);
        }
      });

      results.push(rowResults);
    });

    return results;
  }

  async getRecords(
    results: Array<Array<Result>>,
    teams: Array<Team>
  ): Promise<Records> {
    let biggestHomeWin: Array<RecordResult> = [];
    let biggestAwayWin: Array<RecordResult> = [];
    let moreGoalsMatch: Array<RecordResult> = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = 0; j < results[i].length; j++) {
        const result = results[i][j];
        if (result === null) continue;
        const goalDifference = result.home - result.away;

        if (goalDifference > 0) {
          if (
            biggestHomeWin.length === 0 ||
            goalDifference > biggestHomeWin[0].goals
          ) {
            biggestHomeWin = [
              {
                homeTeam: teams[i],
                awayTeam: teams[j],
                result,
                goals: goalDifference,
                date: undefined,
                matchday: undefined,
                groupId: this._groupId,
              },
            ];
          } else if (goalDifference === biggestHomeWin[0].goals) {
            biggestHomeWin.push({
              homeTeam: teams[i],
              awayTeam: teams[j],
              result,
              goals: goalDifference,
              date: undefined,
              matchday: undefined,
              groupId: this._groupId,
            });
          }
        }

        if (goalDifference < 0) {
          if (
            biggestAwayWin.length === 0 ||
            Math.abs(goalDifference) > biggestAwayWin[0].goals
          ) {
            biggestAwayWin = [
              {
                homeTeam: teams[i],
                awayTeam: teams[j],
                result,
                goals: Math.abs(goalDifference),
                date: undefined,
                matchday: undefined,
                groupId: this._groupId,
              },
            ];
          } else if (Math.abs(goalDifference) === biggestAwayWin[0].goals) {
            biggestAwayWin.push({
              homeTeam: teams[i],
              awayTeam: teams[j],
              result,
              goals: Math.abs(goalDifference),
              date: undefined,
              matchday: undefined,
              groupId: this._groupId,
            });
          }
        }

        if (result.home + result.away > 0) {
          if (
            moreGoalsMatch.length === 0 ||
            result.home + result.away > moreGoalsMatch[0].goals
          ) {
            moreGoalsMatch = [
              {
                homeTeam: teams[i],
                awayTeam: teams[j],
                result,
                goals: result.home + result.away,
                date: undefined,
                matchday: undefined,
                groupId: this._groupId,
              },
            ];
          } else if (result.home + result.away === moreGoalsMatch[0].goals) {
            moreGoalsMatch.push({
              homeTeam: teams[i],
              awayTeam: teams[j],
              result,
              goals: result.home + result.away,
              date: undefined,
              matchday: undefined,
              groupId: this._groupId,
            });
          }
        }
      }
    }

    return await this._fillDateAndMatchday({
      biggestHomeWin,
      biggestAwayWin,
      moreGoalsMatch,
    });
  }

  private async _fillDateAndMatchday(records: Records): Promise<Records> {
    for (let recordType of Object.values(records) as Array<
      Array<RecordResult>
    >) {
      for (let record of recordType) {
        const { date, matchday } =
          await FreUtils.getDateAndMatchdayFromCalendarTeam(
            record,
            this.teamCalendarIndex$
          );
        record.date = date;
        record.matchday = matchday;
      }
    }

    return records;
  }
}
