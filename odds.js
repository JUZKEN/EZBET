const { HLTV } = require('hltv')


async function getMatchOdds(match) {

  const getResults = team => HLTV.getResults({teamID: team.id});

  var resultTeam1 = await getResults(match.team1);
  var resultTeam2 = await getResults(match.team2);

  var teamsForm = getTeamsForm(resultTeam1, resultTeam2);
  var teamsHeadToHead = getTeamsHeadToHead(resultTeam1, match.team2.id);
  var teamsRanking = getTeamsRanking(match);

  return 'Hello Friend';
}


async function getTeamsForm(resultTeam1, resultTeam2) {
  matchesNum = 15;

  var team1RecentResults = getTeamRecentResults(resultTeam1, matchesNum);
  var team2RecentResults = getTeamRecentResults(resultTeam2, matchesNum);

  var team1Form = (team1RecentResults.wins + team2RecentResults.losses) / (matchesNum * 2);
  var team2Form = (team2RecentResults.wins + team1RecentResults.losses) / (matchesNum * 2);

  teamsForm = {team1: team1Form, team2: team2Form}

  return teamsForm;
}


async function getTeamRecentResults(res, matchesNum) {
  var recentResults = {wins: 0, losses: 0}
  for(var i = 0; i < matchesNum; i++ ) {
    result = res[i].result.split(" - ").map(x=>+x); // split result and turn substrings into integers
    // check if its a win
    if( result[0] > result[1] ) {
      recentResults['wins']++;
    } else {
      recentResults['losses']++;
    }
  }
  return recentResults;
}


async function getTeamsHeadToHead(res, team2Id) {
  // TODO: only matches from last 6 months?
  var headToHeadMatches = res.filter(obj => obj.team2.id == team2Id)
  //console.log(headToHeadMatches)
}


async function getTeamsRanking(match) {
  const getTeamHLTVRanking = team => HLTV.getTeamStats({id: team.id});

  var team1Ranking = await getTeamHLTVRanking(match.team1.id);
  var team2Ranking = await getTeamHLTVRanking(match.team2.id);

  console.log(team1Ranking);

}

module.exports = getMatchOdds;
