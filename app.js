const express = require('express')
const { HLTV } = require('hltv')
const getMatchOdds = require('./odds')
const app = express()


app.set('view engine', 'pug')


app.get('/', function (req, res) {

  HLTV.getMatches().then((matches) => {

    firstMatchOdds = getMatchOdds(matches[0]);

    res.render('index', { title: 'HAHA EZ', matches: firstMatchOdds })

  })

})


app.listen(3000, function() {
  console.log('Listening on port 3000...')
})
