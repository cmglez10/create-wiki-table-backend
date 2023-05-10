import axios from "axios";
import Cheerio from "cheerio";
import { last, split, trim } from "lodash";
import { Utils } from "./utils";

export interface PlayoffMatch {
  date: string;
  homeName: string;
  awayName: string;
  homeCompleteName: string;
  awayCompleteName: string;
  homeGoals: number;
  awayGoals: number;
  extraTime: boolean;
  homePenalties?: number;
  awayPenalties?: number;
}

export interface Playoff {
  matches: PlayoffMatch[];
}

export interface PlayoffRound {
  name: string;
  playoffs: Playoff[];
}

export class Playoffs {
  $: cheerio.Root;
  rounds: PlayoffRound[];

  constructor(html: string) {
    this.$ = Cheerio.load(html);
    this.rounds = [];
  }

  async getPlayoffs() {
    const rows: cheerio.Cheerio = this.$(
      "#competicion > #clasificaciones > .ronda_2, #competicion > #clasificaciones > .eliminatoria_uno, #competicion > #clasificaciones > .eliminatoria_resto, #competicion > #clasificaciones > .gol_vis_2"
    );

    for (const row of rows) {
      const rowCheerio = this.$(row);

      if (rowCheerio.hasClass("ronda_2")) {
        const round: PlayoffRound = {
          name: trim(rowCheerio.text()),
          playoffs: [],
        };
        this.rounds.push(round);
      }

      if (rowCheerio.hasClass("eliminatoria_uno")) {
        const match: PlayoffMatch = await this.getMatch(rowCheerio);
        const playoff: Playoff = {
          matches: [match],
        };

        last(this.rounds).playoffs.push(playoff);
      }

      if (rowCheerio.hasClass("eliminatoria_resto")) {
        const playoff: Playoff = last(last(this.rounds).playoffs);
        const match: PlayoffMatch = await this.getMatch(rowCheerio);
        playoff.matches.push(match);
      }

      if (rowCheerio.hasClass("gol_vis_2")) {
        const match: PlayoffMatch = last(
          last(last(this.rounds).playoffs).matches
        );

        const penalties = await this.getPenalties(rowCheerio);
        match.extraTime = true;
        match.homePenalties = penalties.homePenalties;
        match.awayPenalties = penalties.awayPenalties;
      }
    }

    return this.rounds;
  }

  async getMatch(row: cheerio.Cheerio): Promise<PlayoffMatch> {
    return {
      date: trim(this.$(row).find(".fecha").text()),
      homeName: Utils.normalizeName(
        trim(this.$(row).find(".equ_loc_2").text())
      ),
      awayName: Utils.normalizeName(
        trim(this.$(row).find(".equ_vis_2").text())
      ),
      homeCompleteName: await this.getCompleteName(
        this.$(row).find(".equ_loc_2").parent()
      ),
      awayCompleteName: await this.getCompleteName(
        this.$(row).find(".equ_vis_2").parent()
      ),
      homeGoals: Number(this.$(row).find(".gol_loc_2").text()),
      awayGoals: Number(this.$(row).find(".gol_vis_2").text()),
      extraTime: false,
    };
  }

  async getCompleteName(teamLink: cheerio.Cheerio): Promise<string> {
    const teamUrl = teamLink.attr("href");
    if (!teamUrl) {
      return "";
    }

    return Utils.getCompleteName(teamUrl);
  }

  async getPenalties(row: cheerio.Cheerio): Promise<Partial<PlayoffMatch>> {
    const penalties = trim(split(trim(this.$(row).text()), ":")[1]);
    const penaltiesArray = split(penalties, "-");
    return {
      homePenalties: Number(penaltiesArray[0]),
      awayPenalties: Number(penaltiesArray[1]),
    };
  }
}
