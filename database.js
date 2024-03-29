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

    this.balance = this.initBalance();
  }


  writeMatchToHistoryDB(matchDataList) {
    var match = matchDataList[0];
    var bettingData = matchDataList[1];
    var today = new Date(match.date).setHours(0,0,0,0).toString();
    if(Object.keys(this.history).includes(today)) {
      this.history[today][match.id] = {
        "matchID": match.id,
        "date": match.date,
        "event": match.event,
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
        "event": match.event,
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
    var sortedHistory = Object.entries(this.history).sort(function(a, b) {
      var dateA = new Date(parseInt(a[0]));
      var dateB = new Date(parseInt(b[0]));
      if(dateA < dateB) {
        return 1;
      } else {
        return -1;
      }
    });
    // only return matches that are played.
    return sortedHistory.filter(function(item) { return new Date(parseInt(item[0])) < new Date().setHours(0,0,0,0) });
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

              if(this.portfolio[historyId][matchId].outcome.name === this.portfolio[historyId][matchId].betOnTeam) {
                if(this.portfolio[historyId][matchId].team1.name === this.portfolio[historyId][matchId].betOnTeam) {
                  this.balance += this.portfolio[historyId][matchId].betAmount * parseFloat(this.portfolio[historyId][matchId].bettingData.actualBettingOdds.bettingOddsTeam1).toFixed(2) - this.portfolio[historyId][matchId].betAmount;
                } else {
                  this.balance += this.portfolio[historyId][matchId].betAmount * parseFloat(this.portfolio[historyId][matchId].bettingData.actualBettingOdds.bettingOddsTeam2).toFixed(2) - this.portfolio[historyId][matchId].betAmount;
                }
              } else {
                this.balance -= this.portfolio[historyId][matchId].betAmount;
              }
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

  getBalanceTrend() {
    var retVal = new Array();
    var dateKeys = Object.keys(this.portfolio);

    var prevBalance = 0;

    for(var i in dateKeys) {
      var currentBalance = prevBalance;
      var matchKeys = Object.keys(this.portfolio[dateKeys[i]]);

      for(var j in matchKeys) {
        var match = this.portfolio[dateKeys[i]][matchKeys[j]];
        if(match.outcome != null) {
          if(match.outcome.name === match.betOnTeam) {
            if(match.team1.name === match.betOnTeam) {
              currentBalance += match.betAmount * parseFloat(match.bettingData.actualBettingOdds.bettingOddsTeam1).toFixed(2) - match.betAmount;
            } else {
              currentBalance += match.betAmount * parseFloat(match.bettingData.actualBettingOdds.bettingOddsTeam2).toFixed(2) - match.betAmount;
            }
          } else {
            currentBalance -= match.betAmount;
          }
        }
      }
      retVal.push({x: new Date(parseInt(dateKeys[i])), y: parseFloat(currentBalance.toFixed(2))});
      prevBalance = currentBalance;
    }
    return retVal;
  }


  initBalance() {
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
              balance += this.portfolio[dateKey][matchKey].betAmount * parseFloat(this.portfolio[dateKey][matchKey].bettingData.actualBettingOdds.bettingOddsTeam1).toFixed(2) - this.portfolio[dateKey][matchKey].betAmount;
            } else {
              balance += this.portfolio[dateKey][matchKey].betAmount * parseFloat(this.portfolio[dateKey][matchKey].bettingData.actualBettingOdds.bettingOddsTeam2).toFixed(2) - this.portfolio[dateKey][matchKey].betAmount;
            }
          } else {
            balance -= this.portfolio[dateKey][matchKey].betAmount;
          }
        }
      }
    }
    return balance.toFixed(2);
  }

  getBalance() {
    return this.balance;
  }

  async refreshActualBettingOdds(date, match) {
    var actualBettingOdds = await odds.retrieveGGBetBettingOdds(match.matchID);
    if(actualBettingOdds == false) {
      return;
    } else {
      actualBettingOdds.convertedOddsTeam1 = parseFloat((100 / (actualBettingOdds.bettingOddsTeam1 * 106.38)).toFixed(2));
      actualBettingOdds.convertedOddsTeam2 = parseFloat((100 / (actualBettingOdds.bettingOddsTeam2 * 106.38)).toFixed(2));
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