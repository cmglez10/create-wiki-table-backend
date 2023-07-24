import axios from "axios";
import Cheerio from "cheerio";
import { join, map, replace, some, split, trim } from "lodash";

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

const specialFlag: Record<string, string> = {
  Ceuta: "Ceuta",
  Melilla: "Melilla",
  Andorra: "Andorra",
};

export class Utils {
  static addQuotes(teamName: string): string {
    return join(
      map(split(teamName, " "), (part) =>
        part.length === 1 && part !== "y" ? `"${part}"` : part
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

  static async getTeamInfo(teamUrl: string): Promise<TeamInfo> {
    try {
      const html = await axios(BASE_URL + teamUrl);
      const team$ = Cheerio.load(await html.data);
      return {
        completeName: Utils.getCompleteName(team$),
        flag: await Utils.getFlag(team$),
      };
    } catch (e) {
      console.error("[Utils|getTeamInfo] Error getting team info", teamUrl);
      return {
        completeName: "",
        flag: "",
      };
    }
  }
}
