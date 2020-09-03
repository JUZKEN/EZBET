const express = require('express')
const path = require('path');
const { HLTV } = require('hltv')
const getMatchOdds = require('./odds')
const database = require('./database')
const app = express()

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug')

app.get('/', async function (req, res) {
  var content = {title: 'HAHA EZ'};
  var matches = await HLTV.getMatches();

  var matchesBettingData = new Array();

  for(var match in matches) {
    var matchData = await getMatchOdds(match);
    matchesBettingData.push(matchData);
  }
  content['matchesBettingData'] = matchesBettingData;

  saveMatchesToDatabase(matchesBettingData);

  res.render('index', content)
})


app.listen(3000, function() {
  console.log('Listening on port 3000...')
})
