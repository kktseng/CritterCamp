var async = require('async'),
    group = require('./group'),
    helpers = require('./helpers'),
    party = require('./party'),
    wsHandler = require('./wsHandler'),
    user = require('./user');

var messageParty = function(party_id, message, callback) {
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    user.messageAllUsers(users, message, callback);
  });
};

var messagePartyStatus = function(party_id, callback) {
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    user.messageAllUsers(users, 'Party status: ' + users, callback);
  });
}

exports.joinGroup = function(username, message, callback) {
  if(!message.game) {
    return user.messageUser(username, 'You need to specify a game stupid.', callback);
  }
  group.findGroup([username], message.game, function(err, group_id) {
    if(!err && group_id) {
      return group.messageGroupStatus(group_id, callback);
    }
    callback(err);
  });
};

exports.inviteParty = function(username, message, callback) {
  if(!message.user) {
    return user.messageUser(username, 'You need to choose someone to invite downy.');
  }
  // check if user is in party
  party.getParty(message.user, function(err, party_id) {
    if(err) { return callback(err); }
    if(party_id) {
      return user.messageUser(username, 'Holy tamoles, this kids already in a party.', callback);
    }
    // send user the invite
    user.messageUser(message.user, username + ' wants you to join his party. Confirm/Deny?', callback);
  });

};

exports.acceptParty = function(username, message, callback) {
  if(!message.user) {
    return user.messageUser(username, 'You didnt specify whos party genius.', callback);
  }
  party.joinParty(username, message.user, function(err, party_id) {
    if(err) { return callback(err); }
    party.messagePartyStatus(party_id, callback);
  });
};

exports.rejectParty = function(username, message, callback) {
  if(!message.user) {
    return user.messageUser(username, 'Who you rejecting bro?');
  }
  user.messageUser(message.user, username + ' is a twat and rejected your party invite.', callback);
};

exports.removeParty = function(username, message, callback) {
  if(!message.user) {
    return user.messageUser(username, 'Who you removing brah?');
  }
  party.removeFromParty(message.user, function(err, party_id) {
    if(err) { return callback(err); }
    async.parallel([
      async.apply(user.messageUser, message.user, 'You have been removed from the party by the almighty ' + username),
      async.apply(party.messagePartyStatus, party_id)
    ], callback);
  });
};

exports.leaveParty = function(username, message, callback) {
  party.removeFromParty(username, function(err, party_id) {
    if(err) { return callback(err); }
    party.messagePartyStatus(party_id, callback);
  });
}