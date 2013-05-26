var async = require('async'),
    friend = require('../friend'),
    helpers = require('../helpers'),
    party = require('../party'),
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
      if(!info.success) {
        return users.messageUser(username, JSON.stringify(info), callback);
      }
      async.parallel([
        async.apply(friend.areFriends, username, message.username),
        async.apply(party.sameParty, username, message.username),
        async.apply(party.isPartyLeader, username)
      ], function(err, results) {
        if(err) { return callback(err); }
        info.friendStatus = results[0];
        var partyStatus = 0;
        if(results[1]) {
          partyStatus += results[2] ? 2 : 1;
        }
        info.partyStatus = partyStatus;
        users.messageUser(username, JSON.stringify(info), callback);
      });
    });
  } else if(message.type == 'set') {
    if(message.profile === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
    users.setProfile(username, message.profile, callback);
  }
}