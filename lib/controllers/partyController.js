var async = require('async'),
    helpers = require('../helpers'),
    party = require('../party'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'request') {

  } else if(message.type == 'invite') {
    if(!message.user) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    // check if user is in party
    party.getParty(message.user, function(err, party_id) {
      if(err) { return callback(err); }
      // only send invite if the user is not in a party
      if(!party_id) {
        party.getParty(username, function(err, party_id) {
          if(err) { return callback(err); }
          var reply = { action: 'party', type: 'invite', party: party_id, username: username };
          users.messageUser(message.user, JSON.stringify(reply), callback);
        });
      }
    });
  } else if(message.type == 'request') {
    if(!message.user) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    party.requestParty(username, message.user, function(err, party_id) {
      if(err) { return callback(err); }
      party.messagePartyStatus(party_id, callback);
    });
  } else if(message.type == 'leave') {
    party.removeFromParty(username, function(err, party_id) {
      if(err) { return callback(err); }
      party.messagePartyStatus(party_id, callback);
    });
  } else if(message.type == 'acceptInvite') {
    if(!message.user) {
     return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    party.joinParty(username, message.user, function(err, party_id) {
      if(err) { return callback(err); }
      party.messagePartyStatus(party_id, callback);
    });
  } else if(message.type == 'acceptRequest') {
    if(!message.username) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    party.joinParty(message.username, username, function(err, party_id) {
      if(err) { return callback(err); }
      party.messagePartyStatus(party_id, callback);
    });
  } else if(message.type == 'kick') {
    if(!message.user) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    party.removeFromParty(message.user, function(err, party_id) {
      if(err) { return callback(err); }
      var emptyParty = { action: 'party', type: 'update', requests: '{}', list: '{}'};
      async.parallel([
        async.apply(users.messageUser, message.user, JSON.stringify(emptyParty)),
        async.apply(party.messagePartyStatus, party_id)
      ], callback);
    });
  }
}