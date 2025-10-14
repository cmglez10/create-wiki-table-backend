import { chromium } from 'playwright-core';
import { Records, Result, ResultsData } from '../interfaces/results.interface';
import { Team } from '../interfaces/team.interface';

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

          for (let cellIndex = 2; cellIndex < row.cells.length; cellIndex++) {
            const cell = row.cells[cellIndex];
            if (cell.innerText.startsWith('J')) {
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
            .map((name) => ({
              originalName: name,
              name,
            })) as Array<Team>,
          results,
          records: null as Records,
        };
      }
    );

    return results;
  }
}
