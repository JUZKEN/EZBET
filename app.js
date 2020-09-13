const express = require('express')
const path = require('path');
const { HLTV } = require('hltv')
const getMatchOdds = require('./odds')
const database = require('./database');
const app = express()
const Bottleneck = require('bottleneck');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.set('view engine', 'pug')

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 333
});



// ENDPOINTS
app.get('/', async function (req, res) {  
  var teamsRanking = await limiter.schedule(() => HLTV.getTeamRanking());
  app.set('ranking', teamsRanking.map(x => x.team.name).slice(0,20));

  // current matches
  var matches = await limiter.schedule(() => HLTV.getMatches());
  matches = matches.sort(compare_item).filter(filterUsefullMatches);
  await checkOddsAndWriteMatches(matches, app.get('ranking'));
  // TODO:
  var matchesBettingDataHistoryToday = app.get('database').getMatchesFromToday();
  await checkAndWriteMatchesOutcomes();
  console.log(matchesBettingDataHistoryToday);
  var content = {title: 'Home', matchesBettingDataHistoryToday: matchesBettingDataHistoryToday, balance: app.get('database').getCurrentBalance()};
  res.render('index', content)
})


app.get('/history', async function(req, res) {
  var content = {title: 'History', history: app.get('database').getHistorySorted(), balance: app.get('database').getCurrentBalance()};
  res.render('history', content)
})

app.get('/portfolio', async function(req, res) {
  var content = {title: 'Portfolio', portfolio: app.get('database').getPortfolioSorted(), balance: app.get('database').getCurrentBalance()};
  res.render('portfolio', content)
})


app.post('/portfolio', async function(req, res) {
  var data = req.body;
  app.get('database').addMatchToPortfolio(data.matchId, data.teamName, data.betAmount);
})

app.delete('/portfolio', async function(req, res) {
  app.get('database').removeMatchFromPortfolio(req.body.matchId);
})


app.listen(3000, function() {
  console.log('Listening on port 3000...')
  console.log('http://localhost:3000');
  app.set('database', new database());
})



// TOP-LEVEL FUNCTIONALITY


function filterUsefullMatches(match) {
  if(typeof(match.team1) == 'undefined' || typeof(match.team2) == 'undefined' || match.live || app.get('database').isInHistory(match.id)) {
    return false;
  }
  if(match.format !== 'bo3') {
    return false;
  }
  var dateToday = new Date();
  dateToday.setDate(dateToday.getDate() + 2);
  if(new Date(match.date) > dateToday) {
    return false;
  }
  return app.get('ranking').includes(match.team1.name) && app.get('ranking').includes(match.team2.name)
}


async function checkOddsAndWriteMatches(matches, ranking) {
  var matchesBettingData = new Array();
  var nrOfMatches = matches.length > 10 ? 10 : matches.length;
  for(var i = 0; i < nrOfMatches; i++) {
    console.log(matches[i]);
    const {match, bettingData} = await getMatchOdds(matches[i]);
    if(!bettingData) {
      console.log('Couldnt retrieve betting odds for ' + matches[i].team1 + ' vs ' + matches[i].team2);
      console.log('Match Object: ');
      console.log(matches[i]);
      continue;
    } else {
      match.team1.rank = ranking.indexOf(match.team1.name) + 1;
      match.team2.rank = ranking.indexOf(match.team2.name) + 1;
      matchesBettingData.push([match, bettingData]);
      console.log(match);
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