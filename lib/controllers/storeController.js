var async = require('async'),
    helpers = require('../helpers'),
    store = require('../store'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'profile') {
    if(message.profile_to_purchase === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
      store.purchaseProfile(username, message.profile_to_purchase, function(err, success, msg) {
        if(err) { return callback(err); }
        var reply = { action: 'store', type: 'profile', success: success, msg: msg };
        users.messageUser(username, JSON.stringify(reply), callback);
      });
    }
}