var async = require('async'),
    helpers = require('./helpers'),
    users = require('users');

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
        users.getStatus(user.username, function(err, status) {
          if(err) { return callb(err); }
          user.status = status;
          callb();
        });
      }

      async.forEach(result.friend_list, getStatus, function(err) {
        callback(null, result);
      });
    });
  });
};