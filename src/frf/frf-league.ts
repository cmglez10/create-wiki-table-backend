import { bind, capitalize, compact, map, split } from 'lodash';
import { chromium } from 'playwright';
import { LeagueTeam } from '../interfaces/team.interface';

interface ColumnsMap {
  position: number;
  shield: number;
  name?: number;
  points?: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  gf?: number;
  ga?: number;
  sanction?: number;
}

export class FrfLeague {
  // Método helper para inyectar las funciones una sola vez
  private async injectHelperFunctions(page: any) {
    await page.evaluate(() => {
      (window as any).getChildValue = function (
        element: HTMLElement,
        ignoreHidden = true,
        deep = 0
      ): { innerText: string; composedText: string } {
        let composedText = '';
        let innerText = '';
        let beforeText = '';
        let afterText = '';

        if (!ignoreHidden || element?.checkVisibility()) {
          if (element.nodeName !== 'STYLE' && element.nodeName !== 'SCRIPT' && element.nodeType !== Node.COMMENT_NODE) {
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
            beforeText = before.content.replace(/"/g, '');
          }

          const after = window.getComputedStyle(element, '::after');
          if (
            after &&
            after.content &&
            after.content !== 'none' &&
            after.content !== 'normal' &&
            after.display !== 'none'
          ) {
            afterText = after.content.replace(/"/g, '');
          }

          let children = element.children;
          if (children.length > 0) {
            let childComposedTexts = '';
            let childInnerTexts = '';

            for (let i = 0; i < children.length; i++) {
              let child = children[i] as HTMLElement;
              const childTexts = (window as any).getChildValue(child, ignoreHidden, deep + 1);
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

        return { innerText, composedText };
      };

      (window as any).getColumnValue = function (
        row: HTMLTableRowElement,
        columnIndex: number,
        ignoreHidden = true
      ): string {
        if (!row.cells[columnIndex]) return '';
        const texts = (window as any).getChildValue(row.cells[columnIndex], ignoreHidden);
        return texts.composedText;
      };
    });
  }

  private fetchResult(rows: HTMLTableRowElement[]): { teams: LeagueTeam[]; needDetailedView: boolean } {
    // Las funciones están disponibles como propiedades globales de window
    const getColumnValue = (window as any).getColumnValue;

    const ignoreHidden = rows[0].checkVisibility();

    const columns: ColumnsMap = {
      position: 1,
      shield: 2,
    };

    const header = rows[0];
    let column = 0;

    for (let i = 0; i < header!.cells.length; i++) {
      if (header!.cells[i].colSpan > 1) {
        column += header!.cells[i].colSpan - 1;
      }

      const cellText = header!.cells[i].innerText.trim();

      switch (cellText) {
        case 'Ordenar por': {
          columns.name = column;

          break;
        }
        case 'Pts': {
          columns.points = column;

          break;
        }
        case 'J': {
          columns.played = column;

          break;
        }
        case 'G': {
          columns.won = column;
          break;
        }
        case 'P': {
          columns.lost = column;
          break;
        }
        case 'F': {
          columns.gf = column;
          break;
        }
        case 'C': {
          columns.ga = column;
          break;
        }
        case 'Puntos': {
          columns.sanction = column;
          break;
        }
        case 'E.':
        case 'E': {
          columns.drawn = column;

          break;
        }
      }
      column++;
    }

    const goToDetailedView = !columns.gf || !columns.ga;

    let teamsData = rows
      .filter((row) => row.parentNode?.nodeName !== 'THEAD' && row.cells.length >= 10)
      .map((row) => {
        const name = getColumnValue(row, columns.name!, ignoreHidden);
        const gf = Number(getColumnValue(row, columns.gf!, ignoreHidden));
        const ga = Number(getColumnValue(row, columns.ga!, ignoreHidden));

        return {
          teamInfo: {
            completeName: name,
            region: '',
            town: '',
            foundationYear: '',
            ground: '',
          },
          position: Number(getColumnValue(row, columns.position, ignoreHidden) || 0),
          name: name,
          originalName: name,
          shield: row.cells[2]?.querySelector('img')?.src || '',
          points: Number(getColumnValue(row, columns.points!, ignoreHidden) || 0),
          played: Number(getColumnValue(row, columns.played!, ignoreHidden) || 0),
          won: Number(getColumnValue(row, columns.won!, ignoreHidden) || 0),
          drawn: Number(getColumnValue(row, columns.drawn!, ignoreHidden) || 0),
          lost: Number(getColumnValue(row, columns.lost!, ignoreHidden) || 0),
          gf,
          ga,
          gd: gf - ga,
          sanction: Number(getColumnValue(row, columns.sanction!, ignoreHidden) || 0),
        };
      });

    return { teams: teamsData, needDetailedView: goToDetailedView };
  }

  public async scrape(url: string): Promise<LeagueTeam[]> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url);

    page.on('console', (msg) => {
      console.log(msg);
    });

    await page.waitForSelector('#CL_Resumen', { state: 'attached' });

    // Usar el método helper para inyectar las funciones
    await this.injectHelperFunctions(page);

    const fetchResult: { teams: LeagueTeam[]; needDetailedView: boolean } = await page.$$eval(
      '#CL_Resumen table:first-of-type thead:nth-of-type(2) tr, #CL_Resumen table:first-of-type tbody tr',
      bind(this.fetchResult, this)
    );

    if (fetchResult.needDetailedView) {
      const detailedResult: { teams: LeagueTeam[]; needDetailedView: boolean } = await page.$$eval(
        '#CL_Detalle table:first-of-type thead:nth-of-type(2) tr, #CL_Detalle table:first-of-type tbody tr',
        bind(this.fetchResult, this)
      );

      for (let i = 0; i < fetchResult.teams.length; i++) {
        fetchResult.teams[i].gf = detailedResult.teams[i]?.gf || fetchResult.teams[i].gf;
        fetchResult.teams[i].ga = detailedResult.teams[i]?.ga || fetchResult.teams[i].ga;
        fetchResult.teams[i].gd = fetchResult.teams[i].gf - fetchResult.teams[i].ga;
      }
    }

    await browser.close();

    return map(compact(fetchResult.teams), (team) => {
      const capitalizedName = map(split(team.name, ' '), (portion) => capitalize(portion.toLowerCase())).join(' ');
      team.name = capitalizedName;
      team.originalName = team.name;
      team.teamInfo.completeName = capitalizedName;
      return team;
    });
  }
}
