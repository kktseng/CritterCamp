var async = require('async'),
    bcrypt = require('bcrypt'),
    factory = require('./factory'),
    friend = require('../lib/friend'),
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

  describe('Authentication', function() {

    it('can authenticate user with correct username/password', function(done) {
      helpers.m.User.authenticate(user.username, 'password', function(err, auth_user) {
        if(err) { return done(err); }
        auth_user.username.should.eql(user.username);
        done();
      });
    });

    it('should not authenticate user with incorrect username/password', function(done) {
      helpers.m.User.authenticate(user.username, 'incorrect_password', function(err) {
        err.should.eql(new Error('Invalid password'));
        done();
      });
    });

    it('should not authenticate user whose username does not exist', function(done) {
      helpers.m.User.authenticate('nonexistentuser', 'password', function(err) {
        err.should.eql(new Error('User nonexistentuser not found'));
        done();
      });
    });

    it('can create new user account with username, email, password', function(done) {
      helpers.m.User.remove( { username: 'byasukawa'} , function(err) {
        helpers.m.User.createUserAccount('byasukawa', 'byasukawa@hotmail.com', 'password', function(err, created_user) {
          if(err) { return done(err); }
          created_user.username.should.eql('byasukawa');
          done();
        });
      });
    });

    it('can create new user account with only username and login with it', function(done) {
      helpers.m.User.remove( { username: 'createusertest'} , function(err) {
        helpers.m.User.createUser('createusertest', undefined, function(err, created_user, created_user_password) {
          if(err) { return done(err); }
          helpers.m.User.authenticate(created_user.username, created_user_password, function(auth_err, auth_user) {
            if(auth_err) { return done(auth_err); }
            auth_user.username.should.eql(created_user.username);
            done();
          });
        });
      });
    });

    it('should not create user account with existing username when password provided', function(done) {
      helpers.m.User.createUserAccount('testuser', 'test@gmail.com', 'password', function(err) { 
        err.should.eql(new Error('User testuser already exists'));
        done();
      });
    });

    it('should not create user account with existing email', function(done) {
      helpers.m.User.createUserAccount('newuser', 'leungxa@gmail.com', 'password', function(err) {
        err.should.eql(new Error('Email leungxa@gmail.com already in use'));
        done();
      });
    });

    it('should not create user account with existing username when password not provided', function(done) {
      helpers.m.User.createUser('createusertest', undefined, function(err) {
        err.should.eql(new Error('User createusertest already exists'));
        done();
      });
    })

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
      async.forEachSeries(['friend1', 'friend2', 'friend3', 'friend4'], addFriend, function(err) {
        if(err) { return done(err); }
        helpers.m.User.update({ _id: user._id }, { friends: user.friends }, done);
      });
    });

    it('can retrieve friends list', function(done) {
      //set up some values for the test
      helpers.redis.hset('user_friend1', 'status', 'in_party');
      helpers.redis.hset('user_friend2', 'status', 'in_group');
      helpers.redis.hset('user_friend3', 'status', 'online');

      friend.getFriendList(user.username, function(err, result) {
        if(err) { return done(err); }

        //assertion based on values set above
        result.friend_list.should.eql([{ username: 'friend1', status: 'in_party' }, 
                                      { username: 'friend2', status: 'in_group' }, 
                                      { username: 'friend3', status: 'online' },
                                      { username: 'friend4', status: 'offline'}]);
        done();
      })
    });

    it('can find usernames of friends', function(done) {
      user.getFriendNames(function(err, names) {
        names.should.eql(['friend1', 'friend2', 'friend3', 'friend4']);
        done();
      });
    });

    it('can add a new friend', function(done) {
      factory.user({ username: 'friend5' }, function(err, friend) {
        if(err) { return done(err); }
        user.addFriend('friend5', function(err) {
          if(err) { return done(err); }
          user.friends.should.include(friend._id);
          done();
        });
      });
    });

    it('should not add a friend if already on friend list', function(done) {
      user.addFriend('friend4', function(err) {
        should.exist(err);
        user.friends.length.should.equal(4);
        done();
      });
    });

    it('should not add a friend who does not exist', function(done) {
      user.addFriend('does_not_exist', function(err) {
        should.exist(err);
        user.friends.length.should.equal(4);
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
        user.friends.length.should.equal(4);
        done();
      });
    });

  });

  describe('Friend Requests', function() {
    var friend_request_map = {};

    beforeEach(function(done) {
      function addFriendRequest(username, cb) {
        factory.user({ username: username }, function(err, friend_request) {
          if(err) { return cb(err); }
          user.friendRequests.push(friend_request._id);
          friend_request_map[username] = friend_request._id;
          cb();
        });
      }

      user.friendRequests = [];
      async.forEachSeries(['friendRequest1', 'friendRequest2'], addFriendRequest, function(err) {
        if(err) { return done(err); }
        helpers.m.User.update({ _id: user._id }, { friendRequests: user.friendRequests }, done);
      });
    });

    it('can retrieve friends requests list', function(done) {
      friend.getFriendList(user.username, function(err, result) {
        if(err) { return done(err); }
        result.friend_requests.should.eql([ 'friendRequest1', 'friendRequest2' ]);
        done();
      })
    });

    it('can add a new friend request', function(done) {
      factory.user({ username: 'friendRequest3' }, function(err, friend_request) {
        if(err) { return done(err); }
        user.addFriendRequest('friendRequest3', function(err) {
          if(err) { return done(err); }
          user.friendRequests.should.include(friend_request._id);
          done();
        });
      });
    });

    it('should not add a friend request if already on friend requests list', function(done) {
      user.addFriendRequest('friendRequest2', function(err) {
        should.exist(err);
        user.friendRequests.length.should.equal(2);
        done();
      });
    });

    it('should not add a friend request with user who does not exist', function(done) {
      user.addFriendRequest('does_not_exist_request', function(err) {
        should.exist(err);
        user.friendRequests.length.should.equal(2);
        done();
      });
    });

    it('can remove an existing friend request', function(done) {
      user.removeFriendRequest('friendRequest1', function(err) {
        if(err) { return done(err); }
        user.friendRequests.should.not.include(friend_request_map.friendRequest1);
        user.friendRequests.should.include(friend_request_map.friendRequest2);
        done();
      });
    });

    it('should throw an error when removing a friend request that doesn\'t exist', function(done) {
      user.removeFriendRequest('does_not_exist_request', function(err) {
        should.exist(err);
        user.friendRequests.length.should.equal(2);
        done();
      });
    });

  });
});