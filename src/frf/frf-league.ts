import { capitalize, compact, map, split } from 'lodash';
import { chromium } from 'playwright';
import { LeagueTeam } from '../interfaces/team.interface';

export class FrfLeague {
  public async scrape(url: string): Promise<LeagueTeam[]> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url);

    page.on('console', (msg) => {
      console.log(msg);
    });

    await page.waitForSelector('#CL_Resumen', { state: 'attached' });

    const a = 1;

    const teams: LeagueTeam[] = await page.$$eval(
      '#CL_Resumen table:first-child thead:nth-of-type(2) tr, #CL_Resumen table:first-child tbody tr',
      (rows: HTMLTableRowElement[]) => {
        const header = rows[0];

        const columns = {
          position: 1,
          shield: 2,
          name: 3,
          points: 4,
          played: 5,
          won: 6,
          drawn: 7,
          lost: 8,
          gf: 9,
          ga: 10,
          sanction: 12,
        };

        for (let i = 0; i < header!.cells.length; i++) {
          if (header!.cells[i].innerText.includes('Pts')) {
            columns.points = i + 3;
          } else if (header!.cells[i].innerText === 'J') {
            columns.played = i + 3;
          } else if (header!.cells[i].innerText === 'G') {
            columns.won = i + 3;
          } else if (header!.cells[i].innerText === 'E.') {
            columns.drawn = i + 3;
          } else if (header!.cells[i].innerText === 'P') {
            columns.lost = i + 3;
          } else if (header!.cells[i].innerText === 'GF') {
            columns.gf = i + 3;
          } else if (header!.cells[i].innerText === 'GC') {
            columns.ga = i + 3;
          } else if (header!.cells[i].innerText === 'Puntos') {
            columns.sanction = i + 3;
          }
        }

        console.log('Number of rows:', rows.length);

        return rows.map((row, index) => {
          if (row.parentNode?.nodeName === 'THEAD') {
            return null;
          }

          function getChildValue(element: HTMLElement, deep: number): string {
            let composedText = '';

            if (element.checkVisibility()) {
              if (
                element.nodeName !== 'STYLE' &&
                element.nodeName !== 'SCRIPT' &&
                element.nodeType !== Node.COMMENT_NODE
              ) {
                composedText += element.innerText?.trim();
              }

              const before = window.getComputedStyle(element, '::before');
              if (
                before &&
                before.content &&
                before.content !== 'none' &&
                before.content !== 'normal' &&
                before.display !== 'none'
              ) {
                composedText += before.content.replace('"', '').replace('"', '');
              } else {
              }

              const after = window.getComputedStyle(element, '::after');
              if (
                after &&
                after.content &&
                after.content !== 'none' &&
                after.content !== 'normal' &&
                after.display !== 'none'
              ) {
                composedText += after.content.replace('"', '').replace('"', '');
              }

              if (element.hasChildNodes()) {
                let children = element.children;
                for (let i = 0; i < children.length; i++) {
                  let child = children[i] as HTMLElement;
                  const childText = getChildValue(child, deep + 1);
                  if (childText && childText.length > 0 && composedText !== childText) {
                    composedText += childText;
                  }
                }
              }
            }

            return composedText;
          }

          function _getColumnValue(row: HTMLTableRowElement, index: number): string {
            let cell = row.cells[index];

            return getChildValue(cell, 0);
          }

          if (row.cells.length < 11) {
            return null;
          }

          const name = _getColumnValue(row, columns.name) ?? '';
          const gf = Number(_getColumnValue(row, columns.gf) ?? 0);
          const ga = Number(_getColumnValue(row, columns.ga) ?? 0);

          return {
            teamInfo: {
              completeName: name,
              region: '',
              town: '',
              foundationYear: '',
              ground: '',
            },
            position: Number(_getColumnValue(row, columns.position) ?? 0),
            name: name,
            originalName: name,
            shield: row.cells[2]?.querySelector('img')?.src ?? '',
            points: Number(_getColumnValue(row, columns.points) ?? 0),
            played: Number(_getColumnValue(row, columns.played) ?? 0),
            won: Number(_getColumnValue(row, columns.won) ?? 0),
            drawn: Number(_getColumnValue(row, columns.drawn) ?? 0),
            lost: Number(_getColumnValue(row, columns.lost) ?? 0),
            gf,
            ga,
            gd: gf - ga,
            sanction: Number(_getColumnValue(row, columns.sanction) ?? 0),
          };
        });
      }
    );

    await browser.close();

    return map(compact(teams), (team) => {
      const capitalizedName = map(split(team.name, ' '), (portion) => capitalize(portion.toLowerCase())).join(' ');
      team.name = capitalizedName;
      team.originalName = team.name;
      team.teamInfo.completeName = capitalizedName;
      return team;
    });
  }
}
