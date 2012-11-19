var async = require('async'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('News', function() {

  // insert some dummy data into news
  function insertNews(callback) {
    // first clear the collection to prevent news from building up
    helpers.m.News.remove({}, function() {
      async.forEachSeries([0, 1, 2], function(data, cb) {
        var news = new helpers.m.News({ post: 'news: ' + data });
        news.save(cb);
      }, callback);
    });
  }

  it('can grab latest news', function(done) {
    insertNews(function() {
      helpers.m.News.findLatest(2, function(err, results) {
        results[0].post.should.eql('news: 2');
        results[1].post.should.eql('news: 1');
        done();
      });
    });
  });
});