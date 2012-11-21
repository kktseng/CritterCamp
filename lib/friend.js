var async = require('async'),
    helpers = require('./helpers');

/**
* retrieves user's friend list and friend requests
*
* callback(err)
**/
exports.getFriendList = function(username, callback) {
  var result = {};
  var friend_requests = [];
  var friend_list = [];

  //query mongo to get user obj associated with username
  var user;
  helpers.m.User.findOne({ username:username }, function(err, results) {
    if(err) { return callback(err); }
    user = results;
  });

  //call user obj functions to get user's friend list and user's friend requests
  async.parallel([
      async.apply(user.getFriendReqeustsInfo),
      async.apply(user.getFriendInfo) 
    ], function(err, results) {
      if(err) { return callback(err); }
      friend_requests = results[0];
      friend_list = results[1];
    });

  console.log('friendrequests: ' + friend_requests);
  //iterate through each friend in friend list and friend requests. make redis query to get status

  result.friend_requests = friend_requests;
  result.friend_list = friend_list;
  callback(null, result);
};