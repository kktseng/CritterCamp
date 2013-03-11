var async = require('async'),
    helpers = require('../helpers'),
    party = require('../party'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'request') {

  } else if(message.type == 'invite') {
    if(message.user === undefined) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    // check if user is in party
    party.getParty(message.user, function(err, party_id) {
      if(err) { return callback(err); }
      // only send invite if the user is not in a party
      if(party_id) {
        return callback(null);
      }
      party.getParty(username, function(err, party_id) {
        if(err) { return callback(err); }
        var reply = { action: 'party', type: 'invite', party: party_id, username: username };
        users.messageUser(message.user, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'request') {
    if(message.user === undefined) {
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
    if(message.user === undefined || message.party === undefined) {
     return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    // make sure the user is still in the same party
    party.getParty(message.user, function(err, party_id) {
      if(err) { return callback(err); }
      if(party_id != message.party) {
        return callback(null);
      }
      party.joinParty(username, message.user, function(err, party_id) {
        if(err) { return callback(err); }
        party.messagePartyStatus(party_id, callback);
      });
    });
  } else if(message.type == 'acceptRequest') {
    if(message.username === undefined) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    party.joinParty(message.username, username, function(err, party_id) {
      if(err) { 
        if(err.message == 'User already in a party') {
          err = null; // not an error if user is already in a party
        }
        return callback(err);
      }
      party.messagePartyStatus(party_id, callback);
    });
  } else if(message.type == 'kick') {
    if(message.user === undefined) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    // check if users are in the same party before kicking
    party.sameParty(message.user, username, function(err, same_party) {
      if(err) { return callback(err); }
      if(same_party) {
        return callback(null);
      }
      party.removeFromParty(message.user, function(err, party_id) {
        if(err) { return callback(err); }
        var emptyParty = { action: 'party', type: 'update', requests: '{}', list: '{}'};
        async.parallel([
          async.apply(users.messageUser, message.user, JSON.stringify(emptyParty)),
          async.apply(party.messagePartyStatus, party_id)
        ], callback);
      });
    });
  }
}