import { compact } from 'lodash';
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

    const teams: LeagueTeam[] = await page.$$eval('#CL_Resumen table tbody tr', (rows: HTMLTableRowElement[]) => {
      return rows.map((row) => {
        function getChildValue(element: HTMLElement, deep: number): string {
          console.log('getChildValue - deep', deep);

          let composedText = '';

          if (element.checkVisibility()) {
            if (
              element.nodeName !== 'STYLE' &&
              element.nodeName !== 'SCRIPT' &&
              element.nodeType !== Node.COMMENT_NODE
            ) {
              composedText += element.innerText?.trim();
            }

            console.log('getChildValue - node type', element.nodeName, element.nodeType);
            console.log('getChildValue - inner text', element.innerText?.trim());

            const before = window.getComputedStyle(element, '::before');
            if (
              before &&
              before.content &&
              before.content !== 'none' &&
              before.content !== 'normal' &&
              before.display !== 'none'
            ) {
              console.log('getChildValue - before content', before.content);
              composedText += before.content.replace('"', '').replace('"', '');
            } else {
              console.log('getChildValue - no before content', before);
            }

            const after = window.getComputedStyle(element, '::after');
            if (
              after &&
              after.content &&
              after.content !== 'none' &&
              after.content !== 'normal' &&
              after.display !== 'none'
            ) {
              console.log('getChildValue - after content', after.content);
              composedText += after.content.replace('"', '').replace('"', '');
            } else {
              console.log('getChildValue - no after content', after);
            }

            if (element.hasChildNodes()) {
              let children = element.children;
              console.log('getChildValue - has child nodes', children.length);
              for (let i = 0; i < children.length; i++) {
                let child = children[i] as HTMLElement;
                const childText = getChildValue(child, deep + 1);
                if (childText && childText.length > 0 && composedText !== childText) {
                  composedText += childText;
                }
              }
            }
          } else {
            console.log('getChildValue - element is NOT visible', element.nodeName, element.nodeType);
          }

          console.log('getChildValue - composed text', composedText);

          return composedText;
        }

        function _getColumnValue(row: HTMLTableRowElement, index: number): string {
          let cell = row.cells[index];

          console.log('_getColumnValue - column index', index);

          return getChildValue(cell, 0);
        }

        if (row.cells.length < 11) {
          return null;
        }

        const name = _getColumnValue(row, 3) ?? '';

        return {
          teamInfo: {
            completeName: name,
            region: '',
            town: '',
            foundationYear: '',
            ground: '',
          },
          position: Number(_getColumnValue(row, 1) ?? 0),
          name: name,
          originalName: name,
          shield: row.cells[2]?.querySelector('img')?.src ?? '',
          points: Number(_getColumnValue(row, 4) ?? 0),
          played: Number(_getColumnValue(row, 5) ?? 0),
          won: Number(_getColumnValue(row, 6) ?? 0),
          drawn: Number(_getColumnValue(row, 7) ?? 0),
          lost: Number(_getColumnValue(row, 8) ?? 0),
          gf: Number(_getColumnValue(row, 9) ?? 0),
          ga: Number(_getColumnValue(row, 10) ?? 0),
          gd: Number(_getColumnValue(row, 9) ?? 0) - Number(_getColumnValue(row, 10) ?? 0),
          sanction: Number(_getColumnValue(row, 12) ?? 0),
        };
      });
    });

    await browser.close();

    return compact(teams);
  }
}
