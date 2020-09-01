const { HLTV } = require('hltv')


async function getMatchOdds(match) {

  const getTeam = team => HLTV.getTeam({id: team.id});
  var team1Profile = await getTeam(match.team1);
  var team2Profile = await getTeam(match.team2);

  // check if its a top20 match
  if( team1Profile.rank <= 20 && team2Profile.rank <= 20 ) {
    const getResults = team => HLTV.getResults({teamID: team.id});
    var resultTeam1 = await getResults(match.team1);
    var resultTeam2 = await getResults(match.team2);

    var teamsForm = await getTeamsForm(resultTeam1, resultTeam2);
    var teamsHeadToHead = await getTeamsHeadToHead(resultTeam1, match.team2.id);
    var teamsRanking = await getTeamsRanking(match);
  }

  return 'Hello Friend';
}


async function getTeamsForm(resultTeam1, resultTeam2) {
  matchesNum = 15;

  var team1RecentResults = await getTeamRecentResults(resultTeam1, matchesNum);
  var team2RecentResults = await getTeamRecentResults(resultTeam2, matchesNum);

  var team1Form = (team1RecentResults.wins + team2RecentResults.losses) / (matchesNum * 2);
  var team2Form = (team2RecentResults.wins + team1RecentResults.losses) / (matchesNum * 2);

  teamsForm = {team1: team1Form, team2: team2Form}
  return teamsForm;
}


async function getTeamRecentResults(resultTeam1, matchesNum) {
  var recentResults = {wins: 0, losses: 0}
  for(var i = 0; i < matchesNum; i++ ) {
    result = resultTeam1[i].result.split(" - ").map(x=>+x); // split result and turn substrings into integers
    // check if its a win
    result[0] > result[1] ? recentResults['wins']++ : recentResults['losses']++;
  }
  return recentResults;
}


async function getTeamsHeadToHead(resultTeam1, team2Id) {
  var headToHeadMatches = resultTeam1.filter(obj => obj.team2.id == team2Id)

  var matchDateDiffInMS = new Date() - new Date(headToHeadMatches[0].date)
  var matchDateDiffInDays = Math.floor(matchDateDiffInMS/1000/60/60/24);

  // check if match is older than 183 days (around 6 months)
  if(matchDateDiffInDays < 183) {
    var headToHeadResults = {team1MapWins: 0, team2MapWins: 0}
    for(var i = 0; i < headToHeadMatches.length; i++ ) {
      result = headToHeadMatches[i].result.split(" - ").map(x=>+x); // split result and turn substrings into integers

      if( headToHeadMatches[i].format == 'bo1' ) {
        result[0] > result[1] ? headToHeadResults['team1MapWins']++ : headToHeadResults['team2MapWins']++
      } else {
        headToHeadResults['team1MapWins'] += result[0];
        headToHeadResults['team2MapWins'] += result[1];
      }
    }

    totalMaps = headToHeadResults['team1MapWins'] + headToHeadResults['team2MapWins'];
    var team1Form = headToHeadResults['team1MapWins'] / totalMaps;
    var team2Form = headToHeadResults['team2MapWins'] / totalMaps;

    headToHeadForm = {team1: team1Form, team2: team2Form};
    return headToHeadForm;
  }
}


async function getTeamsRanking(match) {
  const getTeamHLTVRanking = team => HLTV.getTeamStats({id: team.id});

  var team1Ranking = await getTeamHLTVRanking(match.team1.id);
  var team2Ranking = await getTeamHLTVRanking(match.team2.id);

  console.log(team1Ranking);

}

module.exports = getMatchOdds;
