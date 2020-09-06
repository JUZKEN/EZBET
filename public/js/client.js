function test() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/portfolio", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    var testObj = new Object();
    testObj.testAttr = 'A Name';
    xhttp.send(JSON.stringify(testObj));
}


function selectMatchForPortfolio(matchId) {
    showPortfolioPopUp(matchId);
}

function showPortfolioPopUp(matchId) {
    // create popup window with details 
    // + 2 fields
    // the team you bet on should be able to select
    // one for the amount of money you bet
    // another for the odds you bet for
    // button cancel + add to portfolio
}

function addSelectedMatchToPortfolio(matchId) {
    // function that reads out the values on the popup,
    // team selected, odds, value
    // send and xhttp req to the server
    // close the popup
    // reload the page
}

function removeFromPortfolio(matchId) {
    // send an xhttp req to the server with the matchId
    var xhttp = new XMLHttpRequest();
    xhttp.open("DELETE", "/portfolio", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify(matchId));
}
