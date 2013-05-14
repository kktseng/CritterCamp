var async = require('async'),
    helpers = require('./helpers'),
    users = require('./users');

/**
* retrieves user's friend list and friend requests
*
* callback(err, result)
**/
exports.getFriendList = function(username, callback) {
  var result = { friend_list: [] };

  // query mongo to get user obj associated with username
  helpers.m.User.findOne({ username:username }, function(err, user) {
    if(err) { return callback(err); }

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