const { HLTV } = require('hltv');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 333
});


async function getMatchOdds(match) {
  if(typeof(match.team1) == 'undefined' || typeof(match.team2) == 'undefined'){
    return false;
  }

  // this returns almost nothing most of the time??
  // func getTeam from HLTV is getting timed out after like 5 runs.
  const getTeam = team => HLTV.getTeam({id: team.id});
  var team1Profile = await limiter.schedule(() => getTeam(match.team1));
  var team2Profile = await limiter.schedule(() => getTeam(match.team2));

  match.team1.logo = team1Profile.logo;
  match.team2.logo = team2Profile.logo;

  const getResults = team => HLTV.getResults({teamID: team.id});
  var resultTeam1 = await limiter.schedule(() => getResults(match.team1));
  var resultTeam2 = await limiter.schedule(() => getResults(match.team2));

  var fullMatchStats = await limiter.schedule(() => HLTV.getMatch({id: match.id}));

  var teamsForm = getTeamsForm(resultTeam1, resultTeam2);
  var teamsHeadToHead = getTeamsHeadToHead(match.team1.id, fullMatchStats.headToHead);
  var teamsRanking = getTeamsRanking(team1Profile, team2Profile);

  var teamsFormScore = teamsForm.team1;
  var teamsHeadToHeadScore = teamsHeadToHead.team1;
  var teamsRankingScore = teamsRanking.team1;

  console.log('form: ' +teamsFormScore + ', h2h: ' + teamsHeadToHeadScore + ', ranking: ' + teamsRankingScore);

  var actualBettingOdds = await retrieveGGBetBettingOdds(match.id);
  if(actualBettingOdds == false) {
    return false;
  } else {
    actualBettingOdds.convertedOddsTeam1 = parseFloat((100 / (actualBettingOdds.bettingOddsTeam1 * 106.38)).toFixed(2));
    actualBettingOdds.convertedOddsTeam2 = parseFloat((100 / (actualBettingOdds.bettingOddsTeam2 * 106.38)).toFixed(2));
  }
  var ezBetOdds = teamsFormScore * .33 + teamsHeadToHeadScore * .33 + teamsRankingScore * .33;
  return {match: match, bettingData: {"teamFormScore": teamsFormScore, "teamsHeadToHeadScore": teamsHeadToHeadScore, "teamsRankingScore": teamsRankingScore, "actualBettingOdds": actualBettingOdds, "ezBetOdds": parseFloat(ezBetOdds.toFixed(2))}};
}


function getTeamsForm(resultTeam1, resultTeam2) {
  matchesNum = 15;

  var team1RecentResults = getTeamRecentResults(resultTeam1, matchesNum);
  var team2RecentResults = getTeamRecentResults(resultTeam2, matchesNum);

  var totalChecked = team1RecentResults.wins + team2RecentResults.losses + team2RecentResults.wins + team1RecentResults.losses;

  //todo: this isnt fair. E.g; team 1, 1 match 1 win over team2 15 matches.
  var team1Form = (team1RecentResults.wins + team2RecentResults.losses) / totalChecked;
  var team2Form = (team2RecentResults.wins + team1RecentResults.losses) / totalChecked;

  teamsForm = {team1: team1Form, team2: team2Form}
  return teamsForm;
}

async function retrieveGGBetBettingOdds(matchId) {
  var responseJsonObj = null;
  const {stdout, stderr} = await exec('scrapy runspider python-spiders/ezbet_scraper.py -a start_url="https://www.hltv.org/matches/' + matchId.toString() + '/yeet"');

  if(stdout.includes('None')) {
    console.log('No odds found for ' + matchId);
    return false;
  } else {
    console.log('Got Actual Odds for ' + matchId + ' and found: ' + stdout);
    responseJsonObj = JSON.parse(stdout.replace(/'/g, '\"'));
    responseJsonObj.bettingOddsTeam1 = parseFloat(responseJsonObj.bettingOddsTeam1);
    responseJsonObj.bettingOddsTeam2 = parseFloat(responseJsonObj.bettingOddsTeam2);
    
    return responseJsonObj;
  }
}


function getTeamRecentResults(resultTeam1, matchesNum) {
  var recentResults = {wins: 0, losses: 0}
  for(var i = 0; i < matchesNum; i++ ) {
    if(i < resultTeam1.length){
      // split result and turn substrings into integers
      result = resultTeam1[i].result.split(" - ").map(x=>+x);

      // check if its a win
      result[0] > result[1] ? recentResults['wins']++ : recentResults['losses']++;
    }
  }
  return recentResults;
}


function getTeamsHeadToHead(team1Id, headToHead) {

  if(typeof(headToHead) == 'undefined') {
    return {"team1": 0.5, "team2": 0.5};
  }

  if(headToHead.length > 15) {
    headToHead.slice(0, 15);
  }
  if(headToHead.length != 0) {
    var team1Won = headToHead.filter(item => item.winner.id == team1Id).length;
    var team2Won = headToHead.filter(item => item.winner.id != team1Id).length;
    return {"team1": (team1Won / headToHead.length), "team2": (team2Won / headToHead.length)};
  } else {
    return {"team1": 0.5, "team2": 0.5};
  }
}


function getTeamsRanking(team1Profile, team2Profile) {
  return {"team1": (19 + (team2Profile.rank - team1Profile.rank)) / 38, "team2": (19 + (team1Profile.rank - team2Profile.rank)) / 38}
}

module.exports.getMatchOdds = getMatchOdds;
module.exports.retrieveGGBetBettingOdds = retrieveGGBetBettingOdds;
