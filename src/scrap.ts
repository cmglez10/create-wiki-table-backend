import Cheerio from "cheerio";
import { map, reduce, split } from "lodash";
import { FUTBOL_REGIONAL_BASE_URL } from "./constants/url-constants";
import { League, LeagueTeam } from "./league";
import { PlayoffRound, Playoffs } from "./playoff";
import { Records, Results, ResultsData } from "./results";
import { Team, TeamInfo, Utils } from "./utils";



export class Scrap {
  async fetchLeague(competition: string, section: string): Promise<LeagueTeam[]> {
    const html = await Utils.getHtml(Utils.getCompetitionUrl(competition, section));
    const league = new League(html);
    return league.getTeams();
  }

  async fetchPlayoff(competition: string, section: string): Promise<PlayoffRound[]> {
    const html = await Utils.getHtml(Utils.getCompetitionUrl(competition, section));
    const playoffs = new Playoffs(html, section);
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

    const  results = new Results(crossTableHtml, teamCalendarHtml, section, parseInt(competition));
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

  async fetchParticipantsFromGroup(groupId: string, section: string): Promise<Team[]> {
    console.log(`Fetching participants from group: ${groupId}`);
    const html = await Utils.getHtml(Utils.getCompetitionUrl(groupId, section));
    const league = new League(html);
    const teams: LeagueTeam[] = await league.getTeams();
    console.log(`Found ${teams.length} teams in group ${groupId}`);
    return map(teams, (team => {
      return {
        originalName: team.originalName,
        completeName: team.teamInfo.completeName,
        name: team.name,
        region: team.teamInfo.region,
        town: team.teamInfo.town,
        foundationYear: team.teamInfo.foundationYear,
        ground: team.teamInfo.ground,
        shield: team.shield,
        coordinates: team.teamInfo.coordinates,
      };
    }));
  }

  async fetchParticipantsFromManyGroups(groupIds: string[], section: string): Promise<TeamInfo[]> {
    console.log(`Fetching participants from groups: ${groupIds.join(', ')}`);
    return await reduce(groupIds, async (acc: Promise<TeamInfo[]>, groupId: string) => {
      const currentParticipants = await this.fetchParticipantsFromGroup(groupId, section);
      const accResult = await acc;
      return [...accResult, ...currentParticipants];
    }, Promise.resolve([]));
  }
}
