import Cheerio from "cheerio";
import { last, split, toNumber, trim } from "lodash";
import { TeamInfo, Utils } from "./utils";

export interface PlayoffMatch {
  date: string;
  homeName: string;
  awayName: string;
  homeCompleteName: string;
  awayCompleteName: string;
  homeFlag: string;
  awayFlag: string;
  homeGoals: number;
  awayGoals: number;
  extraTime: boolean;
  homePenalties?: number;
  awayPenalties?: number;
}

export interface Playoff {
  matches: PlayoffMatch[];
  winner: 1 | 2;
}

export interface PlayoffRound {
  name: string;
  playoffs: Playoff[];
}

export class Playoffs {
  $: cheerio.Root;
  rounds: PlayoffRound[];

  teamsInfo: Record<number, TeamInfo> = {};

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
          winner: undefined,
        };

        last(this.rounds).playoffs.push(playoff);

        playoff.winner = this.getWinner(rowCheerio, playoff, match);
      }

      if (rowCheerio.hasClass("eliminatoria_resto")) {
        const playoff: Playoff = last(last(this.rounds).playoffs);
        const match: PlayoffMatch = await this.getMatch(rowCheerio);
        playoff.matches.push(match);

        playoff.winner = this.getWinner(rowCheerio, playoff, match);
      }
    }

    return this.rounds;
  }

  getWinner(
    row: cheerio.Cheerio,
    playoff: Playoff,
    currentMatch: PlayoffMatch
  ): 1 | 2 {
    if (row.find(".equ_loc_2 b").length > 0) {
      return playoff.matches[0].homeName === currentMatch.homeName ? 1 : 2;
    } else if (row.find(".equ_vis_2 b").length > 0) {
      return playoff.matches[0].awayName === currentMatch.awayName ? 2 : 1;
    } else {
      return undefined;
    }
  }

  async getMatch(row: cheerio.Cheerio): Promise<PlayoffMatch> {
    const homeTeamInfo = await this.getTeamInfo(
      this.$(row).find(".equ_loc_2 > a")
    );
    const awayTeamInfo = await this.getTeamInfo(
      this.$(row).find(".equ_vis_2 > a")
    );

    const homePenalties = split(
      split(this.$(row).find(".equ_loc_2").text(), "[")[1],
      "]"
    )[0];
    const awayPenalties = split(
      split(this.$(row).find(".equ_vis_2").text(), "[")[1],
      "]"
    )[0];
    const resultStr = trim(this.$(row).find(".gol_loc").text());
    const resultArray = split(resultStr, "-");

    return {
      date: trim(this.$(row).find(".fecha").text()),
      homeName: Utils.normalizeName(
        trim(this.$(row).find(".equ_loc_2 a").text())
      ),
      awayName: Utils.normalizeName(
        trim(this.$(row).find(".equ_vis_2 a").text())
      ),
      homeCompleteName: homeTeamInfo.completeName,
      awayCompleteName: awayTeamInfo.completeName,
      homeFlag: homeTeamInfo.flag,
      awayFlag: awayTeamInfo.flag,
      homeGoals: Number(resultArray[0]),
      awayGoals: Number(resultArray[1]),
      extraTime: !!(homePenalties || awayPenalties),
      homePenalties: homePenalties ? toNumber(homePenalties) : undefined,
      awayPenalties: awayPenalties ? toNumber(awayPenalties) : undefined,
    };
  }

  async getTeamInfo(teamLink: cheerio.Cheerio): Promise<TeamInfo> {
    const teamUrl = teamLink.attr("href");
    const teamId: number = parseInt(trim(split(teamUrl, "?")[1]));

    if (!teamId) {
      return {
        completeName: "",
        flag: "",
      };
    }

    if (!this.teamsInfo[teamId]) {
      this.teamsInfo[teamId] = await Utils.getTeamInfo(teamId, 'm');
    }

    return this.teamsInfo[teamId];
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
