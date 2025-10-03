import { chromium } from 'playwright';
import { LeagueTeam } from '../interfaces/team.interface';

export class FrfLeague {
  async scrape(url: string): Promise<LeagueTeam[]> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('#CL_Resumen', { state: 'attached' });

    const teams: LeagueTeam[] = await page.$$eval('#CL_Resumen table tbody tr', (nodes) =>
      Array.from(nodes, (node) => {
        const row = node as HTMLTableRowElement;
        return {
          teamInfo: {
            completeName: row.cells[3]?.innerText ?? '',
            region: '',
            town: '',
            foundationYear: '',
            ground: '',
          },
          position: Number(row.cells[1]?.innerText ?? 0),
          name: row.cells[3]?.innerText ?? '',
          originalName: row.cells[3]?.innerText ?? '',
          shield: row.cells[2]?.querySelector('img')?.src ?? '',
          points: Number(row.cells[4]?.innerText ?? 0),
          played: Number(row.cells[5]?.innerText ?? 0),
          won: Number(row.cells[6]?.innerText ?? 0),
          drawn: Number(row.cells[7]?.innerText ?? 0),
          lost: Number(row.cells[8]?.innerText ?? 0),
          gf: Number(row.cells[9]?.innerText ?? 0),
          ga: Number(row.cells[10]?.innerText ?? 0),
          gd: Number(row.cells[9]?.innerText ?? 0) - Number(row.cells[10]?.innerText ?? 0),
          sanction: Number(row.cells[12]?.innerText ?? 0),
        };
      })
    );

    console.log(teams);

    await browser.close();

    return teams;
  }
}
