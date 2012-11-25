var async = require('async'),
    helpers = require('./helpers');

/**
* retrieves user's friend list and friend requests
*
* callback(err, result)
**/
exports.getFriendList = function(username, callback) {
  var result = {};

  // query mongo to get user obj associated with username
  helpers.m.User.findOne({ username:username }, function(err, user) {
    if(err) { return callback(err); }

    // call user obj functions to get user's friend list and user's friend requests
    async.parallel([
      async.apply(user.getFriendRequestInfo.bind(user)),
      async.apply(user.getFriendInfo.bind(user))
    ], function(err, results) {
      if(err) { return callback(err); }
      
      result.friend_requests = results[0];
      result.friend_list = results[1];

      //iterate through each friend in friend list and friend requests. make redis query to get status
      var getStatus = function(user, callb) {
        async.series([
          function(cb) {
            helpers.redis.exists('user_' + user.username, function(err, rexists) {
              if(err) { return cb(err); }
              if(rexists == false) {
                user.status = 'offline';
                callb();
              } else cb();
            });
          },
          function(cb) {
            helpers.redis.hexists('user_' + user.username, 'group', function(err, hgroup) {
              if(err) { return cb(err); }
              if(hgroup == true) {
                user.status = 'in_group';
                callb();
              } else cb();
            });
          },
          function(cb) {
            helpers.redis.hexists('user_' + user.username, 'party', function(err, hparty) {
              if(err) { return cb(err); }
              if(hparty == true) {
                user.status = 'in_party';
                callb();
              } else cb();
            })
          }
        ], function(err) {
          if(err) { return callb(err); }
          user.status = 'online';
          callb();
        });
      }

      async.forEach(result.friend_list, getStatus, function(err) {
        callback(null, result);
      });
    });
  });
};