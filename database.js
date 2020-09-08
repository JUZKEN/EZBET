var fs = require('fs');
const util = require('util');
const { HLTV } = require('hltv');
const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 333
});


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

  savePortfolio() {
    console.log('Saving Portfolio DB.');
    fs.writeFileSync(dbPaths[1], JSON.stringify(this.portfolio, null, 4));
  }

  async checkAndWriteMatchesOutComes() {
    var historyIds = Object.keys(this.history);
    for(var i=0; i < historyIds.length; i++) {
      
      if(this.history[historyIds[i]].outcome == null) {
        var match = await limiter.schedule(() => HLTV.getMatch({id: parseInt(historyIds[i])}));

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

  getPortfolio() {
    return this.portfolio;
  }

  addMatchToPortfolio(matchId, teamName, betAmount) {
    var match = this.getMatchFromHistory(matchId);
    match.betOnTeam = teamName;
    match.betAmount = parseInt(betAmount);
    var date = new Date(match.date).setHours(0,0,0,0).toString();
    if(Object.keys(this.portfolio).includes(date)) {
      this.portfolio[date][matchId] = match;
    } else {
      this.portfolio[date] = new Object();
      this.portfolio[date][matchId] = match;
    }
    this.savePortfolio();
  }

  removeMatchFromPortfolio(matchId) {
    var dateKeys = Object.keys(this.portfolio);
    var matchKey = matchId.toString();
    for(var i in dateKeys) {
      if(Object.keys(this.portfolio[dateKeys[i]]).includes(matchKey)) {
        delete this.portfolio[dateKeys[i]][matchKey];
        if(Object.keys(this.portfolio[dateKeys[i]]).length === 0 && this.portfolio[dateKeys[i]].constructor === Object) {
          delete this.portfolio[dateKeys[i]];
        }
      }
    }
    this.savePortfolio();
  }


  getMatchesFromToday() {
    var today = new Date().setHours(0,0,0,0).toString();
    if(Object.keys(this.history).includes(today)) {

      var retObj = {};
      var dateKeys = Object.keys(this.history[today]);
      for(var i in dateKeys) {
        if(this.history[today][dateKeys[i]].date > new Date()) {
          retObj[dateKeys[i]] = this.history[today][dateKeys[i]];
        }
      }
      return retObj;
    } else {
      return {};
    }
  }

  getMatchFromHistory(matchId) {
    var dateKeys = Object.keys(this.history);
    for(var i in dateKeys) {
      
      var matchIds =  Object.keys(this.history[dateKeys[i]]);
      var matchIdStr = matchId.toString();
      if(matchIds.includes(matchIdStr)) {
        return this.history[dateKeys[i]][matchIdStr];
      }
    }
    return false;
  }
}


module.exports = EZBETDatabase;