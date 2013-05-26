var async = require('async'),
    helpers = require('../helpers'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'get') {
    if(message.username === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
    helpers.m.User.getUserInfo(message.username, function(err, info) {
      if(err) { return callback(err); }
      info = info || { msg: 'Could not find user ' + username};
      info.success = (info.msg === undefined);
      info.action = 'profile';
      users.messageUser(username, JSON.stringify(info), callback);
    });
  } else if(message.type == 'set') {
    if(message.profile === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
    users.setProfile(username, message.profile, callback);
  }
}