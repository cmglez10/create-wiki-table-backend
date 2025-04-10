import Cheerio from "cheerio";
import { reduce, split } from "lodash";
import { FUTBOL_REGIONAL_BASE_URL } from "./constants/url-constants";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Records, Results, ResultsData } from "./results";
import { Utils } from "./utils";



export class Scrap {
  async fetchLeague(competition: string, section: string): Promise<Team[]> {
    const html = await Utils.getHtml(Utils.getCompetitionUrl(competition, section));
    const league = new League(html);
    return league.getTeams(section);
  }

  async fetchPlayoff(competition: string, section: string): Promise<PlayoffRound[]> {
    const html = await Utils.getHtml(Utils.getCompetitionUrl(competition, section));
    const playoffs = new Playoffs(html);
    return playoffs.getPlayoffs();
  }

  async fetchResults(competition: string, section: string): Promise<ResultsData> {
    const html = await Utils.getHtml(Utils.getCompetitionUrl(competition, section));
    const $ = Cheerio.load(html);
    const hrefTable = $('#post-clasificacion #menu_index:nth-of-type(3) a').attr('href');
    const crossTableResultsUrl = split(hrefTable, "'")[1];
    const crossTableHtml = await Utils.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${crossTableResultsUrl}`);
    const hrefTeamCalendar = $('#post-clasificacion #menu_index:nth-of-type(2) a').attr('href');
    const teamCalendarUrl = split(hrefTeamCalendar, "'")[1];
    const teamCalendarHtml = await Utils.getHtml(`${FUTBOL_REGIONAL_BASE_URL}${teamCalendarUrl}`);

    const  results = new Results(crossTableHtml, teamCalendarHtml, section);
    return results.getResults();
  }

  async fetchRecordsFromManyGroups(groupIds: string[], section: string): Promise<Records> {
    return await reduce(groupIds, async (acc: Promise<Records>, groupId: string) => {
      const currentRecords = (await this.fetchResults(groupId, section)).records;
      const accResult = await acc;

      if (!accResult.biggestHomeWin.length || currentRecords.biggestHomeWin[0].goals > accResult.biggestHomeWin[0].goals) {
        accResult.biggestHomeWin = currentRecords.biggestHomeWin;
      } else if (currentRecords.biggestHomeWin[0].goals === accResult.biggestHomeWin[0].goals) {
        accResult.biggestHomeWin = [...accResult.biggestHomeWin, ...currentRecords.biggestHomeWin];
      }
      if (!accResult.biggestAwayWin.length || currentRecords.biggestAwayWin[0].goals > accResult.biggestAwayWin[0].goals) {
        accResult.biggestAwayWin = currentRecords.biggestAwayWin;
      } else if (currentRecords.biggestAwayWin[0].goals === accResult.biggestAwayWin[0].goals) {
        accResult.biggestAwayWin = [...accResult.biggestAwayWin, ...currentRecords.biggestAwayWin];
      }
      if (!accResult.moreGoalsMatch.length || currentRecords.moreGoalsMatch[0].goals > accResult.moreGoalsMatch[0].goals) {
        accResult.moreGoalsMatch = currentRecords.moreGoalsMatch;
      } else if (currentRecords.moreGoalsMatch[0].goals === accResult.moreGoalsMatch[0].goals) {
        accResult.moreGoalsMatch = [...accResult.moreGoalsMatch, ...currentRecords.moreGoalsMatch];
      }
      return accResult;
    }, Promise.resolve({
      biggestHomeWin: [],
      biggestAwayWin: [],
      moreGoalsMatch: [],
    }));
  
  }
}
