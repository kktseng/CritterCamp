var async = require('async'),
    bcrypt = require('bcrypt'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('User', function() {
  var user;

  beforeEach(function(done) {
    factory.user(function(err, new_user) {
      if(err) { return done(err); }
      user = new_user;
      done();
    });
  });

  it('generated a password correctly with bcrypt', function(done) {
    bcrypt.compareSync('password', user.password).should.be.true;
    done();
  });



  it('can find username from id', function(done) {
    helpers.m.User.getUsername(user._id, function(err, username) {
      if(err) { return done(err); }
      username.should.eql(user.username);
      done();
    });
  });

  it('can find id from username', function(done) {
    helpers.m.User.getId(user.username, function(err, id) {
      if(err) { return done(err); }
      id.should.eql(user._id);
      done();
    });
  });

  describe('Friends', function() {
    var friend_map = {};

    beforeEach(function(done) {
      function addFriend(username, cb) {
        factory.user({ username: username }, function(err, friend) {
          if(err) { return cb(err); }
          user.friends.push(friend._id);
          friend_map[username] = friend._id;
          cb();
        });
      }
      user.friends = [];
      async.forEachSeries(['friend1', 'friend2', 'friend3'], addFriend, function(err) {
        if(err) { return done(err); }
        done();
      });
    });

    it('can find usernames of friends', function(done) {
      user.getFriendNames(function(err, names) {
        names.should.eql(['friend1', 'friend2', 'friend3']);
        done();
      });
    });

    it('can add a new friend', function(done) {
      factory.user({ username: 'friend4' }, function(err, friend) {
        if(err) { return done(err); }
        user.addFriend('friend4', function(err) {
          if(err) { return done(err); }
          user.friends.should.include(friend._id);
          done();
        });
      });
    });

    it('should not add a friend if already on friend list', function(done) {
      user.addFriend('friend3', function(err) {
        should.exist(err);
        user.friends.length.should.equal(3);
        done();
      });
    });

    it('should not add a friend who does not exist', function(done) {
      user.addFriend('does_not_exist', function(err) {
        should.exist(err);
        user.friends.length.should.equal(3);
        done();
      });
    });

    it('can remove an existing friend', function(done) {
      user.removeFriend('friend1', function(err) {
        if(err) { return done(err); }
        user.friends.should.not.include(friend_map.friend1);
        user.friends.should.include(friend_map.friend2);
        user.friends.should.include(friend_map.friend3);
        done();
      });
    });

    it('should throw an error when removing a friend who doesn\'t exist', function(done) {
      user.removeFriend('does_not_exist', function(err) {
        should.exist(err);
        user.friends.length.should.equal(3);
        done();
      });
    });

  });
});