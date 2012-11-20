module.exports = function(username, message, callback) {
  if(message.type == 'request') {

  } else if(message.type == 'invite') {
    if(!message.user) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    // check if user is in party
    party.getParty(message.user, function(err, party_id) {
      if(err) { return callback(err); }
      if(party_id) {
        return users.messageUser(username, 'Holy tamoles, this kids already in a party.', callback);
      }
      // send user the invite
      users.messageUser(message.user, username + ' wants you to join his party. Confirm/Deny?', callback);
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
  } else if(message.type == 'rejectInvite') {
    if(!message.user) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    users.messageUser(message.user, username + ' is a twat and rejected your party invite.', callback);
  } else if(message.type == 'kick') {
    if(!message.user) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    party.removeFromParty(message.user, function(err, party_id) {
      if(err) { return callback(err); }
      async.parallel([
        async.apply(users.messageUser, message.user, 'You have been removed from the party by the almighty ' + username),
        async.apply(party.messagePartyStatus, party_id)
      ], callback);
    });
  }
}