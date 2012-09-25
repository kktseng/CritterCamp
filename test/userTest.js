var async = require('async'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('User', function() {
  var user;

  beforeEach(function(done) {
    factory.user('user', function(err, new_user) {
      if(err) { return done(err); }
      user = new_user;
      done();
    });
  });

  describe('Friends', function() {

    beforeEach(function(done) {
      function addFriend(username, cb) {
        factory.user(username, function(err, friend) {
          if(err) { return cb(err); }
          user.friends.push(friend._id);
          cb();
        });
      }
      user.friends = [];
      async.forEachSeries(['friend1', 'friend2', 'friend3'], addFriend, function(err) {
        if(err) { return done(err); }
        done();
      })
    });

    it('can find usernames of friends', function(done) {
      user.getFriendNames(function(err, names) {
        names.should.eql(['friend1', 'friend2', 'friend3']);
        done();
      });
    });

  });
});