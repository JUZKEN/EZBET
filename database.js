var fs = require('fs');
const util = require('util');
const { HLTV } = require('hltv');
const odds = require('./odds')
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

  getHistorySorted() {
    return Object.entries(this.history).sort(function(a, b) {
      var dateA = new Date(parseInt(a[0]));
      var dateB = new Date(parseInt(b[0]));
      if(dateA < dateB) {
        return 1;
      } else {
        return -1;
      }
    });
  }

  getPortfolioSorted() {
    return Object.entries(this.portfolio).sort(function(a, b) {
      var dateA = new Date(parseInt(a[0]));
      var dateB = new Date(parseInt(b[0]));
      if(dateA < dateB) {
        return 1;
      } else {
        return -1;
      }
    });
  }

  savePortfolio() {
    console.log('Saving Portfolio DB.');
    fs.writeFileSync(dbPaths[1], JSON.stringify(this.portfolio, null, 4));
  }

  async checkAndWriteMatchesOutComes() {
    var historyIds = Object.keys(this.history);
    for(var i=0; i < historyIds.length; i++) {
      var historyId = historyIds[i];
      var matchIds = Object.keys(this.history[historyId]);
      for(var j=0; j< matchIds.length; j++) {
        var matchId = matchIds[j];
        if(this.history[historyId][matchId].outcome == null) {
          var match = await limiter.schedule(() => HLTV.getMatch({id: parseInt(matchId)}));

          if(typeof(match.winnerTeam) != 'undefined') {
            this.history[historyId][matchId].outcome = match.winnerTeam;
            if(typeof(this.portfolio[historyId]) != 'undefined' && Object.keys(this.portfolio[historyId]).includes(matchId)) {
              this.portfolio[historyId][matchId].outcome = match.winnerTeam;
            }
          }
        }
      }
    }
    this.saveHistory();
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
      if(Object.keys(this.portfolio[date]).includes(matchId.toString())) {
        return false;
      } else {
        this.portfolio[date][matchId] = match;
      }
    } else {
      this.portfolio[date] = new Object();
      this.portfolio[date][matchId] = match;
    }
    this.savePortfolio();
    return true;
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

  // todo: this is bad, needs to be atomic

  getCurrentBalance() {
    var balance = 0;

    var dateKeys = Object.keys(this.portfolio);
    for(var i in dateKeys) {
      var dateKey = dateKeys[i];
      var matchKeys = Object.keys(this.portfolio[dateKey]);
      for(var j in matchKeys) {
        var matchKey = matchKeys[j];

        if(this.portfolio[dateKey][matchKey].outcome != null) {
          if(this.portfolio[dateKey][matchKey].outcome.name === this.portfolio[dateKey][matchKey].betOnTeam) {
            if(this.portfolio[dateKey][matchKey].team1.name === this.portfolio[dateKey][matchKey].betOnTeam) {
              balance += this.portfolio[dateKey][matchKey].betAmount * parseFloat(this.portfolio[dateKey][matchKey].bettingData.actualBettingOdds.bettingOddsTeam1).toFixed(2);
            } else {
              balance += this.portfolio[dateKey][matchKey].betAmount * parseFloat(this.portfolio[dateKey][matchKey].bettingData.actualBettingOdds.bettingOddsTeam2).toFixed(2);
            }
          } else {
            balance -= this.portfolio[dateKey][matchKey].betAmount;
          }
        }
      }
    }
    return balance.toFixed(2);
  }

  async refreshActualBettingOdds(date, match) {
    var actualBettingOdds = await odds.retrieveGGBetBettingOdds(match.matchID);
    if(actualBettingOdds == false) {
      return;
    } else {
      this.history[date][match.matchID].bettingData.actualBettingOdds = actualBettingOdds;
    }
  }

  async getMatchesFromToday() {
    var today = new Date().setHours(0,0,0,0).toString();
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrow =tomorrow.setHours(0,0,0,0).toString();
    var retObj = {'today': {}, 'tomorrow': {}};
    if(Object.keys(this.history).includes(today)) {
      var dateKeys = Object.keys(this.history[today]);
      for(var i in dateKeys) {
        if(this.history[today][dateKeys[i]].date > new Date()) {
          await this.refreshActualBettingOdds(today, this.history[today][dateKeys[i]]);
          retObj['today'][dateKeys[i]] = this.history[today][dateKeys[i]];
        }
      }
    }

    if(Object.keys(this.history).includes(tomorrow)) {
      var dateKeys = Object.keys(this.history[tomorrow]);
      for(var i in dateKeys) {
        if(this.history[tomorrow][dateKeys[i]].date > new Date()) {
          await this.refreshActualBettingOdds(tomorrow, this.history[tomorrow][dateKeys[i]]);
          retObj['tomorrow'][dateKeys[i]] = this.history[tomorrow][dateKeys[i]];
        }
      }
    }
    return retObj;
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