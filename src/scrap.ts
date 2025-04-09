import Cheerio from "cheerio";
import { split } from "lodash";
import { FUTBOL_REGIONAL_BASE_URL } from "./constants/url-constants";
import { League, Team } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Results, ResultsData } from "./results";
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
}
