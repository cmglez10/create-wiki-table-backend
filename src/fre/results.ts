import Cheerio from 'cheerio';
import { includes, split, toInteger, trim } from 'lodash';
import { RecordResult, Records, Result, ResultsData } from '../interfaces/results.interface';
import { Team } from '../interfaces/team.interface';
import { Utils } from '../utils/utils';
import { FreUtils } from './utils';

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
    const rows: cheerio.Cheerio = this.crossTable$('#calendario > div > div');

    const teams = await this.getTeams(rows);
    const results = await this.getResultsArray(rows);
    const records = await this._fillDateAndMatchdayToRecords(await Utils.getRecords(results, teams, this._groupId));

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
      const columns = this.crossTable$(row).find('div');

      results.push(await this.getTeamInfo(this.crossTable$(columns).first().find('a')));
    }

    return results;
  }

  async getTeamInfo(teamLink: cheerio.Cheerio): Promise<Team> {
    const teamName = teamLink.text().trim();
    const teamUrl = teamLink.attr('href');

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

      const rowColumns = this.crossTable$(row).find('div');

      const rowResults: Array<Result> = [];

      rowColumns.each((j, column) => {
        if (j < 2) return;

        const result = this.crossTable$(column).text();

        if (result && includes(result, '-')) {
          const [home, away] = split(result, '-');
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

  private async _fillDateAndMatchdayToRecords(records: Records): Promise<Records> {
    for (let recordType of Object.values(records) as Array<Array<RecordResult>>) {
      for (let record of recordType) {
        const { date, matchday } = await FreUtils.getDateAndMatchdayFromCalendarTeam(record, this.teamCalendarIndex$);
        record.date = date;
        record.matchday = matchday;
      }
    }

    return records;
  }
}
