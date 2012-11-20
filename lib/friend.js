var async = require('async'),
    helpers = require('./helpers'),

/**
* retrieves user's friend list and friend requests
*
* callback(err)
**/
exports.getFriendLists = function(username, callback) {
  var result = {};
  var friend_requests = [];
  var friend_list = [];
  
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    users.messageAllUsers(users, message);
    callback(null);
  });
};