const express = require('express')
const path = require('path');
const { HLTV } = require('hltv')
const odds = require('./odds')
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

  // current matches and filter useless ones out
  var matches = await limiter.schedule(() => HLTV.getMatches());
  matches = matches.sort(compare_item).filter(filterUsefullMatches);
  console.log(matches);
  // calculate odds + collect actual betting odds, write to DB
  await checkOddsAndWriteMatches(matches, app.get('ranking'));

  // get all collected matches from DB
  var matchesBettingDataHistoryToday = await app.get('database').getMatchesFromToday();

  // check if any outcomes are known
  await app.get('database').checkAndWriteMatchesOutComes();

  var content = {title: 'Home', matchesBettingDataHistoryToday: matchesBettingDataHistoryToday, balance: app.get('database').getBalance()};
  res.render('index', content)
})


app.get('/history', async function(req, res) {
  var content = {title: 'History', history: app.get('database').getHistorySorted(), balance: app.get('database').getBalance()};
  res.render('history', content)
})

app.get('/portfolio', async function(req, res) {
  var content = {title: 'Portfolio', portfolio: app.get('database').getPortfolioSorted(), balance: app.get('database').getBalance()};
  res.render('portfolio', content)
})

app.get('/portfolio/chart', async function(req, res) {
  res.send(JSON.stringify(app.get('database').getBalanceTrend()));
})


app.post('/portfolio', async function(req, res) {
  var data = req.body;
  var success = app.get('database').addMatchToPortfolio(data.matchId, data.teamName, data.betAmount);
  res.send(JSON.stringify({success: success}));
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

  // onle best of threes
  if(match.format !== 'bo3') {
    return false;
  }

  // get matches that are recent
  var dateToday = new Date();
  dateToday.setDate(dateToday.getDate() + 2);
  if(new Date(match.date) > dateToday) {
    return false;
  }
  // filter out matches with unknown oppontents
  return app.get('ranking').includes(match.team1.name) && app.get('ranking').includes(match.team2.name)
}


async function checkOddsAndWriteMatches(matches, ranking) {
  var matchesBettingData = new Array();
  var nrOfMatches = matches.length > 10 ? 10 : matches.length;
  for(var i = 0; i < nrOfMatches; i++) {
    console.log(matches[i]);
    const {match, bettingData} = await odds.getMatchOdds(matches[i]);
    if(!bettingData) {
      console.log('Couldnt retrieve betting odds for ' + matches[i].team1 + ' vs ' + matches[i].team2);
      console.log('Match Object: ');
      console.log(matches[i]);
      continue;
    } else {
      match.team1.rank = ranking.indexOf(match.team1.name) + 1;
      match.team2.rank = ranking.indexOf(match.team2.name) + 1;
      matchesBettingData.push([match, bettingData]);
    }
  }
  for(var i in matchesBettingData) {
    app.get('database').writeMatchToHistoryDB(matchesBettingData[i]);
  }
  app.get('database').saveHistory();
  return matchesBettingData;
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