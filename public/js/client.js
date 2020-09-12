
$(document).ready(function() {
    
    if( $('#match-detail-wrapper').html().length > 0 ) {
        firstMatchId = $('#match-detail-wrapper >:first-child').data('matchid');
        showMatchDetails(firstMatchId);
    }
    createPopupWindow();

});

var popupWindow;

function createPopupWindow() {
    popupWindow = document.createElement('div');
    popupWindow.id = 'popup-window';
    document.getElementById('content').appendChild(popupWindow);
    popupWindow.innerHTML = '<div class="match-detail"><div class="team"></div><div class="team"></div></div>';
}


function test() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/history/2343641", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          console.log(JSON.parse(this.responseText));
        }
      };
    xhttp.send();
}


function showMatchDetails(matchId) {
    $('.match-detail, .match-tease').removeClass('active');
    $('.match-detail[data-matchid='+matchId+'], .match-tease[data-matchid='+matchId+']').addClass('active');
}


function showPortfolioPopUp(team1Name, team2Name, matchId) {
    // create popup window with details 
    // + 2 fields
    // the team you bet on should be able to select
    // one for the amount of money you bet
    // another for the odds you bet for
    // button cancel + add to portfolio
    
}

function addSelectedMatchToPortfolio(matchId) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/portfolio", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(JSON.parse(this.responseText));
        }
    };
    var teamName = 'faze';
    var betAmount = 200;
    xhttp.send(JSON.stringify({'matchId': matchId, 'teamName': teamName, 'betAmount': betAmount}));
}

function removeFromPortfolio(matchId) {
    // send an xhttp req to the server with the matchId
    var xhttp = new XMLHttpRequest();
    xhttp.open("DELETE", "/portfolio", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify({'matchId': matchId}));
}
