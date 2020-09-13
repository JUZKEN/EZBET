
$(document).ready(function() {
    
    if( $('#match-detail-wrapper').html().length > 0 ) {
        firstMatchId = $('#match-detail-wrapper >:first-child').data('matchid');
        showMatchDetails(firstMatchId);
    }
});


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


function addSelectedMatchToPortfolio(matchId, team1Name, team2Name) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/portfolio", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(JSON.parse(this.responseText));
        }
    };
    var teamName;
    var team1Selected = document.getElementById(matchId + '.' + team1Name).checked;
    if (team1Selected) {
        teamName = team1Name;
    } else {
        teamName = team2Name;
    }
    var betAmount = parseInt(document.getElementById(matchId + '.betAmount').value);
    if(betAmount > 0) {
        xhttp.send(JSON.stringify({'matchId': matchId, 'teamName': teamName, 'betAmount': betAmount}));
    }
}

function removeFromPortfolio(matchId) {
    // send an xhttp req to the server with the matchId
    var xhttp = new XMLHttpRequest();
    xhttp.open("DELETE", "/portfolio", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify({'matchId': matchId}));
}
