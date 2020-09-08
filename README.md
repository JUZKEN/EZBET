# EZBET
Node.js web application for predicting CSGO matches outcomes

## Setup
- npm install (inside project folder)
- pip install scrapy (with python installed)
- change getTeam.js line 78 in node_modules\hltv to:
```id: Number(parsing_1.popSlashSource(matchEl.find('.team-logo-container img'))),```
- comment getMatch.js line 96 in node_modules\hltv
