var async = require('async'),
    helpers = require('./helpers'),

/**
* retrieves user's friend list and friend requests
*
* callback(err)
**/
exports.getFriendList = function(username, callback) {
  var result = {};
  var friend_requests = [];
  var friend_list = [];

  //query redis and mongo to retrieve friend requests and friend list; put in result JSON obj

  callback(result);
};