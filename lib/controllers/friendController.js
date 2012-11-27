var async = require('async'),
    helpers = require('./helpers'),
    friend = require('./friend');

module.exports = function(username, message, callback) {
  if(message.type == 'update') {
    friend.getFriendList(username, function(err, result) {
      if(err) { return callback(err); }
      //not sure if this is correct...
      callback(null, result);
    });
  } else if(message.type == 'request') {

  } else if(message.type == 'accept') {

  } else if(message.type == 'reject') {

  } else if(message.type == 'remove') {
    
  }
}