const express = require('express')
const path = require('path');
const { HLTV } = require('hltv')
const getMatchOdds = require('./odds')
const database = require('./database');
const { match } = require('assert');
const app = express()

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.set('view engine', 'pug')



// ENDPOINTS
app.get('/', async function (req, res) {
  var content = {title: 'HAHA EZ'};
  
  var teamsRanking = await HLTV.getTeamRanking();
  app.set('ranking', filterTeamsFromRanking(teamsRanking).slice(0,20));

  // current matches
  var matches = await HLTV.getMatches();
  matches = matches.sort(compare_item).filter(filterUsefullMatches);
  content['matchesBettingData'] = await checkOddsAndWriteMatches(matches);

  // previous matches
  await checkAndWriteMatchesOutcomes();

  res.render('index', content)
})


app.get('/history', async function(req, res) {
  //todo
})

app.get('/portfolio', async function(req, res) {
  //todo
})


app.post('/portfolio', async function(req, res) {
  // add the portfolio data to the portfolio db
  // req.body contains an object with bet data and team chose for X amount
  console.log(req.body);
})

app.delete('/portfolio', async function(req, res) {
  // delete the matchId from the portfolio db
  // req.body contains matchId
  console.log(req.body);
})


app.listen(3000, function() {
  console.log('Listening on port 3000...')
  console.log('http://localhost:3000');
  app.set('database', new database());
})




// TOP-LEVEL FUNCTIONALITY
function filterTeamsFromRanking(teamsRanking) {
  return teamsRanking.map(x => x.team.name);
}

function filterUsefullMatches(match) {
  if(typeof(match.team1) == 'undefined' || typeof(match.team2) == 'undefined' || match.live) {
    return false;
  }
  var dateToday = new Date();
  dateToday.setDate(dateToday.getDate() + 2);
  if(new Date(match.date) > dateToday) {
    return false;
  }
  return app.get('ranking').includes(match.team1.name) && app.get('ranking').includes(match.team2.name)
}


async function checkOddsAndWriteMatches(matches) {
  var matchesBettingData = new Array();
  var nrOfMatches = matches.length > 10 ? 10 : matches.length;

  for(var i = 0; i < nrOfMatches; i++) {
    console.log(matches[i].team1.name + '  vs.  ' + matches[i].team2.name);
    var bettingData = await getMatchOdds(matches[i]);
    if(!bettingData) {
      console.log('Couldnt retrieve betting odds for ' + matches[i].team1 + ' vs ' + matches[i].team2);
      console.log('Match Object: ');
      console.log(matches[i]);
      continue;
    } else {
      matchesBettingData.push([matches[i], bettingData]);
    }
  }

  for(var i in matchesBettingData) {
    app.get('database').writeMatchToHistoryDB(matchesBettingData[i]);
  }
  app.get('database').saveHistory();
  return matchesBettingData;
}


async function checkAndWriteMatchesOutcomes() {
  app.get('database').checkAndWriteMatchesOutComes();
}

function compare_item(a, b) {
  if(new Date(a.date) < new Date(b.date)) {
    return -1;
  } else if(new Date(a.date) > new Date(b.date)) {
    return 1;
  } else {
    return 0;
  }
}