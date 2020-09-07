var fs = require('fs');
const util = require('util');
const { HLTV } = require('hltv');

const readFile = util.promisify(fs.readFile);
const dbPaths = ['./json-dbs/history.json', './json-dbs/portfolio.json'];

class EZBETDatabase {

  constructor() {
    if(!fs.existsSync('./json-dbs')) {
      fs.mkdirSync('./json-dbs');
    }

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


  // TODO: collect by date -> match id for better display on /history
  writeMatchToHistoryDB(matchDataList) {
    var match = matchDataList[0];
    var bettingData = matchDataList[1];
    var today = new Date(match.date).setHours(0,0,0,0).toString();
    if(Object.keys(this.history).includes(today)) {
      this.history[today][match.id] = {
        "matchID": match.id,
        "date": match.date,
        "team1": match.team1,
        "team2": match.team2,
        "bettingData": bettingData,
        "outcome": null
      };
    } else {
      this.history[today] = new Object();
      this.history[today][match.id] = {
        "matchID": match.id,
        "date": match.date,
        "team1": match.team1,
        "team2": match.team2,
        "bettingData": bettingData,
        "outcome": null
      };
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

  isInHistory(matchId) {
    var keys = Object.keys(this.history);
    for(var i in keys) {
      if(Object.keys(this.history[keys[i]]).includes(matchId.toString())) {
        return true;
      }
    }
  }

  getHistory() {
    return this.history;
  }

  // TODO: fix time comparison
  // fix formatting
  getHistoryToday() {
    var today = new Date().setHours(0,0,0,0).toString();
    if(Object.keys(this.history).includes(today)) {
      return this.history[today];
    } else {
      return {};
    }
  }
}


module.exports = EZBETDatabase;