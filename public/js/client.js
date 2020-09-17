$(document).ready(function() {
    
    if( $('#match-detail-wrapper').html().length > 0 ) {
        firstMatchId = $('#match-detail-wrapper >:first-child').data('matchid');
        showMatchDetails(firstMatchId);
    }

    if( $('#portfolio-chart').length > 0) {
        renderPortfolioChartData();
    }
});


function renderPortfolioChartData() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/portfolio/chart", true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var data = JSON.parse(this.responseText);
            console.log(data);
            var chart = new Chart($('#portfolio-chart')[0].getContext('2d'), {
                type: 'line',
                data: {
                    labels: data.map(a =>a.x),
                    datasets: [{
                        label: 'Balance',
                        data: data.map(a => a.y),
                        backgroundColor: [
                            'rgba(19, 20, 25, 0.2)'
                        ],
                        borderColor: [
                            '#131419'
                        ],
                        borderWidth: 3
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            type: 'time',
                            time: {
                                unit: 'month'
                            }
                        }],
                        yAxes: [{
                            ticks: {
                                maxTicksLimit: 20,
                                beginAtZero: true
                            }
                        }]
                    },
                    legend: false                 
                }
            });
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
