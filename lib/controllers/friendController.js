var async = require('async'),
    helpers = require('../helpers'),
    friend = require('../friend');

module.exports = function(username, message, callback) {
  if(message.type == 'update') {
    friend.getFriendList(username, function(err, result) {
      if(err) { return callback(err); }
      //not sure what to do here
    });
  } else if(message.type == 'request') {

  } else if(message.type == 'accept') {

  } else if(message.type == 'reject') {

  } else if(message.type == 'remove') {
    
  }
}