import axios from "axios";
import Cheerio from "cheerio";
import { find, join, last, replace, split, toInteger, trim } from "lodash";
import { COMPETITION_URL, FUTBOL_REGIONAL_BASE_URL } from "./constants/url-constants";
import { RecordResult } from "./results";

export interface TeamInfo {
  completeName: string;
  flag: string;
}

const BASE_URL = "https://www.futbol-regional.es/";

const translateFlag: Record<string, string> = {
  "Comunitat Valenciana": "Comunidad Valenciana",
  "Illes Balears": "Islas Baleares",
  Catalunya: "Cataluña",
  "Comunidad Foral de Navarra": "Navarra",
  "Andorra la Vella": "Andorra",
};

const transformTeamName: Record<string, string> = {
  'Club de Fútbol Badalona "B"': "Club de Fútbol Badalona",
  "Club Deportivo Badajoz": "Club Deportivo Badajoz (1905-2012)",
  "Valencia-Mestalla": "Valencia Club de Fútbol Mestalla",
};

export class Utils {
  static addQuotes(teamName: string): string {
    const bits = split(teamName, " ");
    if (last(bits).length === 1) {
      bits[bits.length - 1] = `"${last(bits)}"`;
    }
    return join(bits, " ");
  }

  static getBaseUrl(): string {
    return BASE_URL;
  }

  static getCompleteName(team$: cheerio.Root): string {
    const cName = Utils.addQuotes(
      split(team$("#derecha_sup_equ").text(), " :: ")[1]
    );
    if (transformTeamName[cName]) {
      return transformTeamName[cName];
    }
    return cName;
  }

  static normalizeName(name: string): string {
    return Utils.addQuotes(
      replace(trim(replace(name, new RegExp("\\.", "g"), ". ")), "  ", " ")
    );
  }

  static async getFlag(team$: cheerio.Root): Promise<string> {
    let elementOrder = 0;
    team$(
      team$("#informacion")
        .children()
        .each((i, elem) => {
          if (team$(elem).text().trim() === "Domicilio social:") {
            elementOrder = i + 1;
          }
        })
    );

    const links = team$(
      team$("#informacion").children()[elementOrder]
    ).children();
    let flag = "";
    if (links.length === 2) {
      flag = team$(
        team$(team$("#informacion").children()[elementOrder]).children()[0]
      )
        .text()
        .trim();
    } else {
      const provinceUrl = team$(
        team$(team$("#informacion").children()[elementOrder]).children()[1]
      ).attr("href");

      const provinceHtml = await axios(BASE_URL + provinceUrl);
      const province$ = Cheerio.load(await provinceHtml.data);
      flag = split(
        split(province$("#derecha_sup_fic").text(), " :: ")[1],
        "("
      )[1]
        .trim()
        .slice(0, -1);
    }
    return translateFlag[flag] ?? flag;
  }

  static async getTeamInfo(teamId: number, section: string): Promise<TeamInfo> {
    try {
      const html = await axios(`${BASE_URL}equipo.php?sec=${section}&${teamId}`);
      const team$ = Cheerio.load(await html.data);
      return {
        completeName: Utils.getCompleteName(team$),
        flag: await Utils.getFlag(team$),
      };
    } catch (e) {
      return {
        completeName: "",
        flag: "",
      };
    }
  }


  static async getHtml(url: string): Promise<string> {
    const html = await axios(url);
    return html.data;
  }

  static getCompetitionUrl(competition: string, section: string): string {
    return `${FUTBOL_REGIONAL_BASE_URL}${COMPETITION_URL}?com=${competition}&sec=${section}`;
  }

  static async getDateAndMatchdayFromCalendarTeam(record: RecordResult, calendarTeam$: cheerio.Root, section: string): Promise<{date: string, matchday: number}>{
    const teamButtons = calendarTeam$("#calendario > a > div#tem-competicion");
    
    const teamButton = find(teamButtons, (button) => {
      return calendarTeam$(button).text().trim() === record.homeTeam.originalName;
    });

    const teamResultsUrl = split(calendarTeam$(teamButton).parent().attr("href"), "'")[1];
    const teamResultsHtml = await this.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${teamResultsUrl}`);
    const teamResults$ = Cheerio.load(teamResultsHtml);
    const rivalCells = teamResults$("table.clasificacion td > a").parent();
    const rivalCell = find(rivalCells, (cell) => {
      return teamResults$(cell).text().trim() === record.awayTeam.originalName;
    });
    const firstResult = teamResults$(rivalCell).next().next().next().next().text().trim();
    console.log('firstResult', firstResult);
    const recordResult = `${record.result.home}-${record.result.away}`;
    console.log('recordResult', recordResult);
    if (firstResult === recordResult) {
      console.log('primera vuelta');
      console.log('return', {
        date: split(teamResults$(rivalCell).next().next().text().trim(), ", ")[1],
        matchday: toInteger(teamResults$(rivalCell).next().next().next().text().trim()),
      });

      return {
        date: split(teamResults$(rivalCell).next().next().text().trim(), ", ")[1],
        matchday: toInteger(teamResults$(rivalCell).next().next().next().text().trim()),
      }
    } else {
      console.log('segunda vuelta');
      console.log('return', {
        date: split(teamResults$(rivalCell).next().next().next().next().next().next().text().trim(), ", ")[1],
        matchday: toInteger(teamResults$(rivalCell).next().next().next().next().next().next().next().text().trim()),
      });
      return {
        date: split(teamResults$(rivalCell).next().next().next().next().next().next().text().trim(), ", ")[1],
        matchday: toInteger(teamResults$(rivalCell).next().next().next().next().next().next().next().text().trim()),
      }
    }
  }
}
