var async = require('async'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('News', function() {

  // insert some dummy data into news
  var news = [];
  for(var i = 0; i < 3; i++) {
    news.push(new helpers.m.News({ post: 'news: ' + i }));
    news[i].save();
  }

  it('can grab latest news', function(done) {
    helpers.m.News.findLatest(2, function(err, results) {
      results[0].post.should.eql('news: 2');
      results[1].post.should.eql('news: 1');
      done();
    });
  });
});