const express = require('express')
const path = require('path');
const { HLTV } = require('hltv')
const getMatchOdds = require('./odds')
const app = express()

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug')

app.get('/', async function (req, res) {
  var content = {title: 'HAHA EZ'};
  var matches = await HLTV.getMatches();

  content['nextMatchOdds'] = await getMatchOdds(matches[0])

  res.render('index', content)
})


app.listen(3000, function() {
  console.log('Listening on port 3000...')
})
