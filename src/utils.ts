import axios from "axios";
import Cheerio from "cheerio";
import { join, map, replace, split, trim } from "lodash";

const BASE_URL = "https://www.futbol-regional.es/";

export interface TeamInfo {
  completeName: string;
  flag: string;
}

export class Utils {
  static addQuotes(teamName: string): string {
    return join(
      map(split(teamName, " "), (part) =>
        part.length === 1 ? `"${part}"` : part
      ),
      " "
    );
  }

  static getBaseUrl(): string {
    return BASE_URL;
  }

  static getCompleteName(team$: cheerio.Root): string {
    const cName = Utils.addQuotes(
      split(team$("#derecha_sup_equ").text(), " :: ")[1]
    );
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
    const provinceUrl = team$(
      team$(team$("#informacion").children()[elementOrder]).children()[1]
    ).attr("href");

    const provinceHtml = await axios(BASE_URL + provinceUrl);
    const province$ = Cheerio.load(await provinceHtml.data);
    const flag = split(
      split(province$("#derecha_sup_fic").text(), " :: ")[1],
      "("
    )[1]
      .trim()
      .slice(0, -1);
    return flag;
  }

  static async getTeamInfo(teamUrl: string): Promise<TeamInfo> {
    const html = await axios(BASE_URL + teamUrl);
    const team$ = Cheerio.load(await html.data);
    return {
      completeName: Utils.getCompleteName(team$),
      flag: await Utils.getFlag(team$),
    };
  }
}
