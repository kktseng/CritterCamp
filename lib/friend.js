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
  User.findOne({ username:username }, function(err, results) {
    if(err) { return callback(err); }
    var user_obj = results;
  });

  //call user obj functions to get user's friend list and user's friend requests
  async.parallel([
    function(){ 
      user_obj.getFriendRequests( function(err, requests_results) {
        if(err) { return callback(err); }
        friend_requests = requests_results;
      });
    },
    function(){
      user_obj.getFriendList( function(err, list_results) {
        if(err) { return callback(err); }
        friend_list = list_results;
      });
    }
  ]);

  //iterate through each friend in friend list and friend requests. make redis query to get status


  callback(result);
};