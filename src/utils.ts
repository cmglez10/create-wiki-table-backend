import axios from "axios";
import Cheerio from "cheerio";
import { find, join, last, replace, split, toInteger, trim } from "lodash";
import { COMPETITION_URL, FUTBOL_REGIONAL_BASE_URL } from "./constants/url-constants";
import { RecordResult } from "./results";

export interface TeamInfo {
  completeName: string;
  region: string;
  town: string;
  foundationYear: string;
  ground: string;
  coordinates?: Array<string>;
}

export interface Team {
  originalName: string;
  completeName: string;
  name: string;
  region: string;
  town: string;
  foundationYear: string;
  ground: string;
  shield?: string;
  coordinates?: Array<string>;
}

export interface TeamInfoRequestOptions {
  region?: boolean;
  coordinates?: boolean;
}

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
    return FUTBOL_REGIONAL_BASE_URL;
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

  static getTown(team$: cheerio.Root): string {
    const addressElement =  team$(this.getTeamInfoData(team$, "Domicilio social:"))
    return team$(addressElement).children().first().text().trim();
  }

  static getTeamFoundationYear(team$: cheerio.Root): string {
    const fundationElement = team$(this.getTeamInfoData(team$, "Alta:"));
    return team$(fundationElement).text().trim();
  }

  static getTeamGroundName(team$: cheerio.Root): string {
    const groundElement = team$(this.getTeamInfoData(team$, "Terrenos de juego:"));
    return team$(groundElement).find("a").first().text().trim();
  }

  static normalizeName(name: string): string {
    return Utils.addQuotes(
      replace(trim(replace(name, new RegExp("\\.", "g"), ". ")), "  ", " ")
    );
  }

  static getTeamInfoData(team$: cheerio.Root, data: string): cheerio.Cheerio {
    let elementOrder = 0;
    team$(
      team$("#informacion")
        .children()
        .each((i, elem) => {
          if (team$(elem).text().trim() === data) {
            elementOrder = i + 1;
          }
        })
    );

    return team$(
      team$("#informacion").children()[elementOrder]
    );
  }

  static async getRegion(team$: cheerio.Root): Promise<string> {
    const links = team$(this.getTeamInfoData(team$, "Domicilio social:")).children();

    let flag = "";
    if (links.length === 2) {
      flag = team$(links[0])
        .text()
        .trim();
    } else {
      const provinceUrl = team$(
        team$(links[1])
      ).attr("href");    
    
      const provinceHtml = await Utils.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${provinceUrl}`);
      const province$ = Cheerio.load(provinceHtml);
      flag = split(
        split(province$("#derecha_sup_fic").text(), " :: ")[1],
        "("
      )[1]
        .trim()
        .slice(0, -1);
    }
    return translateFlag[flag] ?? flag;
  }

  static async getTeamInfo(teamUrl: string, options: TeamInfoRequestOptions = { region: true, coordinates: true }): Promise<TeamInfo> {
    const url = `${FUTBOL_REGIONAL_BASE_URL}${teamUrl}`
    
    try {
      const data = await Utils.getHtml(url);

      const team$ = Cheerio.load(await data);

      const teamInfo: TeamInfo = {
        completeName: Utils.getCompleteName(team$),
        region: options.region ?  await Utils.getRegion(team$): "",
        town: Utils.getTown(team$),
        foundationYear: Utils.getTeamFoundationYear(team$),
        ground: Utils.getTeamGroundName(team$),
        coordinates: options.coordinates ? await Utils.getCoordinates(team$) : null,
      };

      console.log(`Fetching team info from ${url}`, JSON.stringify(teamInfo, null, 2));

      return teamInfo;
    } catch (e) {
      console.log(`Error fetching team info from ${url}:`);
      return {
        completeName: "",
        region: "",
        town: "",
        foundationYear: "",
        ground: "",
      };
    }
  }

  static async getCoordinates(team$: cheerio.Root): Promise<Array<string>> {
    const groundElement = team$(this.getTeamInfoData(team$, "Terrenos de juego:"));
    const groundUrl = team$(groundElement).find("a").first().attr("href");
    if (!groundUrl) {
      return null;
    }
    const groundHtml = await Utils.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${groundUrl}`);
    const ground$ = Cheerio.load(groundHtml);
    const gmapsUrl = ground$("#tdj_izq").find("#tdj_map").next().find("a").attr("href");
    const coordinates = split(split(gmapsUrl, "q=")[1], ",");
    return coordinates;
  }



  static async getHtml(url: string): Promise<string> {
    const html = await axios.get(url);
    return html.data;
  }

  static getCompetitionUrl(competition: string, section: string): string {
    return `${FUTBOL_REGIONAL_BASE_URL}${COMPETITION_URL}?com=${competition}&sec=${section}`;
  }

  static async getDateAndMatchdayFromCalendarTeam(record: RecordResult, calendarTeam$: cheerio.Root): Promise<{date: string, matchday: number}>{
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
    const recordResult = `${record.result.home}-${record.result.away}`;
    if (firstResult === recordResult) {
      return {
        date: split(teamResults$(rivalCell).next().next().text().trim(), ", ")[1],
        matchday: toInteger(teamResults$(rivalCell).next().next().next().text().trim()),
      }
    } else {
      return {
        date: split(teamResults$(rivalCell).next().next().next().next().next().next().text().trim(), ", ")[1],
        matchday: toInteger(teamResults$(rivalCell).next().next().next().next().next().next().next().text().trim()),
      }
    }
  }
}
