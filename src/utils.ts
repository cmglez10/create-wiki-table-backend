import axios from "axios";
import Cheerio from "cheerio";
import { join, map, split } from "lodash";

const BASE_URL = "https://www.futbol-regional.es/";

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

  static async getCompleteName(teamUrl: string) {
    const html = await axios(BASE_URL + teamUrl);
    const team$ = Cheerio.load(await html.data);
    const cName = Utils.addQuotes(
      split(team$("#derecha_sup_equ").text(), " :: ")[1]
    );
    return cName;
  }
}
