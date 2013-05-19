var async = require('async'),
    helpers = require('../helpers'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'get') {
    if(message.username === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
  } else if(message.type == 'set') {
    if(message.profile === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
    users.setProfile(username, message.profile, callback);
  }
}