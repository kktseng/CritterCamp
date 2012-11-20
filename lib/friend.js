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

  //query mongo to get user obj associated with username
  var user_obj = User.findOne({ username:username });

  //call user obj functions to get user's friend list and user's friend requests
  user_obj.getFriendRequests( function(err, requests_results) {
    if(err) { callback(err); }
    friend_requests = requests_results;
  });

  user_obj.getFriendList( function(err, list_results) {
    if(err) { callback(err); }
    friend_list = list_results;
  });

  //iterate through each friend in friend list and friend requests. make redis query to get status


  callback(result);
};