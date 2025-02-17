import Cheerio from "cheerio";
import { includes, split } from "lodash";

export interface Result {
  home: string;
  away: string;
}

export interface ResultsData {
  teams: Array<any>;
  results: Array<Array<Result>>;
}

export class Results {
  $: cheerio.Root;
 
  constructor(html: string) {
    this.$ = Cheerio.load(html);
    console.log("Results -> constructor -> this.$", this.$("html").text());
  }

  async getResults(): Promise<ResultsData> {
    console.log("getResults");
    const rows: cheerio.Cheerio = this.$(
      "div.col-sm-12 > table.table.table-striped.table-bordered.table-hover > tbody > tr"
    );

    console.log("getResults ->  text", this.$("body").text());
    console.log("getResults -> rows text", rows.text());


    return {
      teams: await this.getTeams(rows),
      results: await this.getResultsArray(rows),
    }
  }

  async getTeams(rows: cheerio.Cheerio): Promise<Array<any>> {
    const teams: Array<any> = [];

    const firstRow = rows.first();

    const columns = firstRow.find("td");

    console.log("getTeams -> columns text", columns.text());

    columns.each((i, column) => {
      if (i < 2) return;

      const team = this.$(column).find("b").text();
      teams.push(team);
    });

    return teams;
  }

  async getResultsArray(rows: cheerio.Cheerio): Promise<Array<Array<Result>>> {
    const results: Array<Array<Result>> = [];

    rows.each((i, row) => {
      if (i === 0) return;

      const rowColumns = this.$(row).find("td");

      const rowResults: Array<Result> = [];

      rowColumns.each((i, column) => {
        if (i === 0) return;

        const result = this.$(column).find("a > b")?.text();

        if (result && includes(result, " - ")) {
          const [home, away] = split(result, " - ");
          rowResults.push({ home, away });
        } else {
          rowResults.push(null);
        }
      });
          

      results.push(rowResults);
    });

    return results;
  }
  
}
