var async = require('async'),
    helpers = require('./helpers'),
    users = require('./users');

/**
* retrieves user's friend list and friend requests
*
* callback(err, result)
**/
var getFriendList = exports.getFriendList = function(username, callback) {
  var result = { friend_list: [] };

  // query mongo to get user obj associated with username
  helpers.m.User.findOne({ username:username }, function(err, user) {
    if(err) { return callback(err); }

    if(user == null) { return { friend_list: [], friend_requests: [] }; }
    // call user obj functions to get user's friend list and user's friend requests
    async.parallel([
      async.apply(user.getFriendRequestNames.bind(user)),
      async.apply(user.getFriendNames.bind(user))
    ], function(err, results) {
      if(err) { return callback(err); }

      results[1].forEach(function(username) {
        result.friend_list.push({ username: username });
      });
      result.friend_requests = results[0];

      // iterate through each friend in friend list and friend requests. make redis query to get status
      var getStatus = function(user, cb) {
        users.getStatus(user.username, function(err, status) {
          if(err) { return cb(err); }
          user.status = status;
          cb();
        });
      }

      async.each(result.friend_list, getStatus, function(err) {
        callback(err, result);
      });
    });
  });
};

/**
* checks the friend status of two users
* 0 = not friends
* 1 = friends
* 2 = user2 has requested user1
*
* callback(err, status)
**/
exports.areFriends = function(username1, username2, callback) {
  getFriendList(username1, function(err, result) {
    if(err) { return callback(err); }
    var status = 0;
    // check if in friends list
    result.friend_list.forEach(function(friend) {
      if(username === friend) {
        status = 1;
      }
    });
    // check if in friend requests
    if(status === 0) {
      result.friend_requests.forEach(function(friend) {
        if(username == friend) {
          status = 2;
        }
      });
    }
    callback(null, status);
  });
}