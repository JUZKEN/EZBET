import scrapy


class HLTVSpider(scrapy.Spider):
    name = 'hltvSpider'

    def __init__(self, *args, **kwargs):
        super(HLTVSpider, self).__init__(*args, **kwargs)

        self.start_urls = [kwargs.get('start_url')]

    def parse(self, response):
        odds = {'bettingOddsTeamA': response.xpath('//table[1]//tr[3]//td[2]//a//text()').get(), 'bettingOddsTeamB': response.xpath('//table[1]//tr[3]//td[4]//a//text()').get()}
        print(odds)
        yield odds

# command line thing for node;    scrapy runspider ezbet_scraper.py -a start_url="https://www.hltv.org/matches/2343612/yeet"
# note: matchid needs to be specified. 2343612


