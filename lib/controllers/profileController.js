var async = require('async'),
    helpers = require('../helpers'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'get') {
    if(message.username === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
      users.getUser(username, function(err, user) {
        if(err) { return callback(err); }
        var reply = user.getUserInfo();
        reply.action = 'profile';
        users.messageUser(username, JSON.stringify(reply), callback);
      });
    }
    
  } else if(message.type == 'set') {
    if(message.profile === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
    users.setProfile(username, message.profile, callback);
  }
}