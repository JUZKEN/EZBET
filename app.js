const express = require('express')
const { HLTV } = require('hltv')
const app = express()


app.set('view engine', 'pug')

app.get('/', function (req, res) {

  HLTV.getMatches().then((matches) => {

    res.render('index', { title: 'HAHA EZ', matches: matches })

  })

})

app.listen(3000, function() {
  console.log('Listening on port 3000...')
})
