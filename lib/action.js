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
  async.parallel([
    async.apply(party.getParty, username),
    async.apply(party.getParty, message.user)
  ], function(err, results) {
    if(err) { return callback(err); }
    // check if accepting user is a party
    if(results[0]) {
      return user.messageUser(username, 'Youre already in a party mr. popular.', callback);
    // check if message.user has an existing party
    } else if(results[1]) {
      var party_id = results[1];
      helpers.redis.multi()
        .hset('user_' + username, 'party', party_id)
        .lpush('party_' + party_id, username)
        .exec(function(err) {
          if(err) { callback(err); }
          messagePartyStatus(party_id, callback);
        });
    } else {
      // create a new id for the party
      helpers.createId(function(err, party_id) {
        if(err) { return callback(err); }
        helpers.redis.multi()
          .lpush('party_' + party_id, username, message.user)
          .hset('user_' + message.user, 'party', party_id)
          .hset('user_' + username, 'party', party_id)
          .exec(function(err) {
            if(err) { return callback(err); }
            user.messageAllUsers([username, message.user], 'You are now in party ' + party_id, callback);
          });
      });
    }
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