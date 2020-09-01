const { HLTV } = require('hltv')


async function getMatchOdds(match) {

  teamsForm = await getTeamsForm(match);
  teamsHeadToHead = await getTeamsHeadToHead(match);

  return 'Hello Friend';
}


async function getTeamsForm(match) {
  matchesNum = 15;

  var team1RecentResults = await getTeamRecentResults(match.team1, matchesNum);
  var team2RecentResults = await getTeamRecentResults(match.team2, matchesNum);

  var team1Form = (team1RecentResults.wins + team2RecentResults.losses) / (matchesNum * 2);
  var team2Form = (team2RecentResults.wins + team1RecentResults.losses) / (matchesNum * 2);

  teamsForm = {team1: team1Form, team2: team2Form}

  return teamsForm;
}


async function getTeamRecentResults(team, matchesNum) {
  const getResults = team => HLTV.getResults({teamID: team.id});
  var res = await getResults(team);

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


async function getTeamsHeadToHead(match) {
  const getResults = team => HLTV.getResults({teamID: team.id});
  var res = await getResults(match.team1);

  // TODO: only matches from last 6 months?
  var headToHeadMatches = res.filter(obj => obj.team2.id == match.team2.id)
  //console.log(headToHeadMatches)
}


module.exports = getMatchOdds;
