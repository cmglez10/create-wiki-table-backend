import { LeagueTeam } from '../interfaces/team.interface';
import { FrfLeague } from './frf-league';

export class FrfScrap {
  async fetchLeague(url: string): Promise<LeagueTeam[]> {
    const league = new FrfLeague();
    return league.scrape(url);
  }
}
