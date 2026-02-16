import { capitalize, map, reduce, split } from 'lodash';
import { chromium } from 'playwright-core';
import { Records, Result, ResultsData } from '../interfaces/results.interface';
import { Team } from '../interfaces/team.interface';
import { Utils } from '../utils/utils';

export class FrfResults {
  async fetchResults(url: string): Promise<ResultsData> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url);

    page.on('console', (msg) => {
      console.log(msg);
    });

    await page.waitForSelector('table.table.table-striped.table-bordered.table-hover tbody tr', { state: 'attached' });

    const results: ResultsData = await page.$$eval(
      'table.table.table-striped.table-bordered.table-hover tbody tr',
      (rows: HTMLTableRowElement[]) => {
        const header = rows[0];

        const teamNames: Array<string> = Array.from(header.cells, (cell, index) => {
          if (index <= 1) return null;

          return cell.innerText?.trim() ?? '';
        });

        const results: Array<Array<Result>> = [];

        rows.forEach((row, index) => {
          if (index === 0) return;

          const teamResults: Array<Result> = [];

          for (let cellIndex = 1; cellIndex < row.cells.length; cellIndex++) {
            const cell = row.cells[cellIndex];
            if (!cell.innerText.includes(' - ')) {
              teamResults.push(null);
            } else {
              const [home, away] = cell.innerText.split(' - ').map((score: string) => parseInt(score.trim(), 10));

              teamResults.push({ home, away });
            }
          }

          results.push(teamResults);
        });

        return {
          teams: teamNames
            .filter((name) => name !== null)
            .map((name) => {
              return {
                originalName: name,
                name,
              };
            }) as Array<Team>,
          results,
          records: null as Records,
        };
      }
    );

    results.teams = map(results.teams, (team) => {
      const capitalizedName = map(split(team.name, ' '), (portion) => capitalize(portion.toLowerCase())).join(' ');
      return {
        originalName: capitalizedName,
        name: capitalizedName,
        completeName: capitalizedName,
      };
    }) as Array<Team>;

    results.records = await Utils.getRecords(results.results, results.teams, url);

    return results;
  }

  async fetchRecordsFromManyUrls(urls: string[]): Promise<Records> {
    return await reduce(
      urls,
      async (acc: Promise<Records>, url: string) => {
        const currentRecords = (await this.fetchResults(url)).records;
        const accResult = await acc;

        if (
          currentRecords.biggestHomeWin.length &&
          (!accResult.biggestHomeWin.length ||
            currentRecords.biggestHomeWin[0].goals > accResult.biggestHomeWin[0].goals)
        ) {
          accResult.biggestHomeWin = currentRecords.biggestHomeWin;
        } else if (
          currentRecords.biggestHomeWin.length &&
          accResult.biggestHomeWin.length &&
          currentRecords.biggestHomeWin[0].goals === accResult.biggestHomeWin[0].goals
        ) {
          accResult.biggestHomeWin = [...accResult.biggestHomeWin, ...currentRecords.biggestHomeWin];
        }

        if (
          currentRecords.biggestAwayWin.length &&
          (!accResult.biggestAwayWin.length ||
            currentRecords.biggestAwayWin[0].goals > accResult.biggestAwayWin[0].goals)
        ) {
          accResult.biggestAwayWin = currentRecords.biggestAwayWin;
        } else if (
          currentRecords.biggestAwayWin.length &&
          accResult.biggestAwayWin.length &&
          currentRecords.biggestAwayWin[0].goals === accResult.biggestAwayWin[0].goals
        ) {
          accResult.biggestAwayWin = [...accResult.biggestAwayWin, ...currentRecords.biggestAwayWin];
        }

        if (
          currentRecords.moreGoalsMatch.length &&
          (!accResult.moreGoalsMatch.length ||
            currentRecords.moreGoalsMatch[0].goals > accResult.moreGoalsMatch[0].goals)
        ) {
          accResult.moreGoalsMatch = currentRecords.moreGoalsMatch;
        } else if (
          currentRecords.moreGoalsMatch.length &&
          accResult.moreGoalsMatch.length &&
          currentRecords.moreGoalsMatch[0].goals === accResult.moreGoalsMatch[0].goals
        ) {
          accResult.moreGoalsMatch = [...accResult.moreGoalsMatch, ...currentRecords.moreGoalsMatch];
        }

        return accResult;
      },
      Promise.resolve({
        biggestHomeWin: [],
        biggestAwayWin: [],
        moreGoalsMatch: [],
      })
    );
  }
}
