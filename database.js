var fs = require('fs');
const util = require('util');
const { HLTV } = require('hltv');

const readFile = util.promisify(fs.readFile);
const dbPaths = ['./json-dbs/history.json', './json-dbs/portfolio.json'];

class EZBETDatabase {

  constructor() {
    for(var path in dbPaths) {
      try {
        if (fs.existsSync(dbPaths[path])) {
        } else {
          fs.writeFileSync(dbPaths[path], '{}');
        }
      } catch(err) {
        console.error(err)
      }
    }

    this.history = JSON.parse(fs.readFileSync(dbPaths[0], 'utf8'));
    this.portfolio = JSON.parse(fs.readFileSync(dbPaths[1], 'utf8'));
  }

  writeMatchToHistoryDB(matchDataList) {
    var match = matchDataList[0];
    var bettingData = matchDataList[1];

    this.history[match.id] = {
      "matchID": match.id,
      "date": match.date,
      "team1": match.team1,
      "team2": match.team2,
      "bettingData": bettingData,
      "outcome": null
    }
  }

  saveHistory() {
    console.log('Saving History DB.');
    fs.writeFileSync(dbPaths[0], JSON.stringify(this.history, null, 4));
  }


  async checkAndWriteMatchesOutComes() {
    var historyIds = Object.keys(this.history);
    for(var i=0; i < historyIds.length; i++) {

      if(this.history[historyIds[i]].outcome == null) {
        var match = await HLTV.getMatch({id: parseInt(historyIds[i])});

        if(typeof(match.winnerTeam) != 'undefined') {
          this.history[historyIds[i]].outcome = match.winnerTeam;
        }
      }
    }
  }


}


module.exports = EZBETDatabase;