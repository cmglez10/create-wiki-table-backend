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
      '#CL_Resumen table:first-of-type thead:nth-of-type(2) tr, #CL_Resumen table:first-of-type tbody tr',
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
          } else if (header!.cells[i].innerText === 'F') {
            columns.gf = i + 3;
          } else if (header!.cells[i].innerText === 'C') {
            columns.ga = i + 3;
          } else if (header!.cells[i].innerText === 'Puntos') {
            columns.sanction = i + 3;
          }
        }

        return rows.map((row, rowIndex) => {
          if (row.parentNode?.nodeName === 'THEAD') {
            return null;
          }

          function getChildValue(
            element: HTMLElement,
            deep = 0
          ): {
            innerText: string;
            composedText: string;
          } {
            let composedText = '';
            let innerText = '';
            let beforeText = '';
            let afterText = '';

            if (element.checkVisibility()) {
              if (
                element.nodeName !== 'STYLE' &&
                element.nodeName !== 'SCRIPT' &&
                element.nodeType !== Node.COMMENT_NODE
              ) {
                innerText = element.innerText.trim();
              }

              const before = window.getComputedStyle(element, '::before');
              if (
                before &&
                before.content &&
                before.content !== 'none' &&
                before.content !== 'normal' &&
                before.display !== 'none'
              ) {
                beforeText = before.content.replace('"', '').replace('"', '');
              }

              const after = window.getComputedStyle(element, '::after');
              if (
                after &&
                after.content &&
                after.content !== 'none' &&
                after.content !== 'normal' &&
                after.display !== 'none'
              ) {
                afterText = after.content.replace('"', '').replace('"', '');
              }

              let children = element.children;
              if (children.length > 0) {
                let childComposedTexts = '';
                let childInnerTexts = '';

                for (let i = 0; i < children.length; i++) {
                  let child = children[i] as HTMLElement;
                  const childTexts = getChildValue(child, deep + 1);
                  const childInnerText = childTexts.innerText.trim();

                  if (childInnerText.length > 0 && innerText.includes(childInnerText)) {
                    innerText = innerText.replace(childInnerText, '').trim();
                  }
                  childComposedTexts += childTexts.composedText;
                  childInnerTexts += childInnerText;
                }

                composedText = beforeText + innerText + childComposedTexts + afterText;
                innerText = innerText + childInnerTexts;
              } else {
                composedText = beforeText + innerText + afterText;
              }
            }

            return {
              innerText,
              composedText,
            };
          }

          function _getColumnValue(row: HTMLTableRowElement, columnIndex: number): string {
            let cell = row.cells[columnIndex];

            const texts = getChildValue(cell);

            return texts.composedText;
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
