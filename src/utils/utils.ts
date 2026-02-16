import { RecordResult, Records, Result } from '../interfaces/results.interface';
import { Team } from '../interfaces/team.interface';

export class Utils {
  static async getRecords(results: Array<Array<Result>>, teams: Array<Team>, groupId: number): Promise<Records> {
    let biggestHomeWin: Array<RecordResult> = [];
    let biggestAwayWin: Array<RecordResult> = [];
    let moreGoalsMatch: Array<RecordResult> = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = 0; j < results[i].length; j++) {
        const result = results[i][j];
        if (result === null) continue;
        const goalDifference = result.home - result.away;

        if (goalDifference > 0) {
          if (biggestHomeWin.length === 0 || goalDifference > biggestHomeWin[0].goals) {
            biggestHomeWin = [
              {
                homeTeam: teams[i],
                awayTeam: teams[j],
                result,
                goals: goalDifference,
                date: undefined,
                matchday: undefined,
                groupId,
              },
            ];
          } else if (goalDifference === biggestHomeWin[0].goals) {
            biggestHomeWin.push({
              homeTeam: teams[i],
              awayTeam: teams[j],
              result,
              goals: goalDifference,
              date: undefined,
              matchday: undefined,
              groupId,
            });
          }
        }

        if (goalDifference < 0) {
          if (biggestAwayWin.length === 0 || Math.abs(goalDifference) > biggestAwayWin[0].goals) {
            biggestAwayWin = [
              {
                homeTeam: teams[i],
                awayTeam: teams[j],
                result,
                goals: Math.abs(goalDifference),
                date: undefined,
                matchday: undefined,
                groupId,
              },
            ];
          } else if (Math.abs(goalDifference) === biggestAwayWin[0].goals) {
            biggestAwayWin.push({
              homeTeam: teams[i],
              awayTeam: teams[j],
              result,
              goals: Math.abs(goalDifference),
              date: undefined,
              matchday: undefined,
              groupId,
            });
          }
        }

        if (result.home + result.away > 0) {
          if (moreGoalsMatch.length === 0 || result.home + result.away > moreGoalsMatch[0].goals) {
            moreGoalsMatch = [
              {
                homeTeam: teams[i],
                awayTeam: teams[j],
                result,
                goals: result.home + result.away,
                date: undefined,
                matchday: undefined,
                groupId,
              },
            ];
          } else if (result.home + result.away === moreGoalsMatch[0].goals) {
            moreGoalsMatch.push({
              homeTeam: teams[i],
              awayTeam: teams[j],
              result,
              goals: result.home + result.away,
              date: undefined,
              matchday: undefined,
              groupId,
            });
          }
        }
      }
    }

    return {
      biggestHomeWin,
      biggestAwayWin,
      moreGoalsMatch,
    };
  }
}
