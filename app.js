const express = require('express')
const path = require('path');
const { HLTV } = require('hltv')
const getMatchOdds = require('./odds')
const database = require('./database');
const app = express()

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug')

app.get('/', async function (req, res) {
  var content = {title: 'HAHA EZ'};
  var matches = await HLTV.getMatches();
  
  matches = matches.sort(compare_item);

  var matchesBettingData = new Array();
  
  var nrOfMatches = matches.length > 30 ? 30 : matches.length;
  for(var i = 0; i < nrOfMatches; i++) {
    var bettingData = await getMatchOdds(matches[i]);
    console.log(bettingData);
    if(!bettingData) {
      continue;
    } else {
      matchesBettingData.push([matches[i], bettingData]);
    }
  }
  content['matchesBettingData'] = matchesBettingData;

  console.log(matchesBettingData);
  for(var i in matchesBettingData) {
    app.get('database').writeMatchToHistoryDB(matchesBettingData[i]);
  }
  app.get('database').saveHistory();

  res.render('index', content)
})


app.listen(3000, function() {
  console.log('Listening on port 3000...')
  app.set('database', new database());
})


function compare_item(a, b){
  // a should come before b in the sorted order
  if(new Date(a.date) < new Date(b.date)){
          return -1;
  // a should come after b in the sorted order
  }else if(new Date(a.date) > new Date(b.date)){
          return 1;
  // and and b are the same
  }else{
          return 0;
  }
}