var group = require('./group'),
    helpers = require('./helpers'),
    wsHandler = require('./wsHandler'),
    user = require('./user');

exports.joinGroup = function(user_id, message, callback) {
  if(!message.game) {
    return user.messageUser(user_id, 'You need to specify a game stupid.');
  }
  group.findGroup([user_id], message.game, function(err, group_id) {
    if(err) { callback(err); }
    helpers.redis.hset('user_' + user_id, 'group', group_id);
    callback(null, group_id);
  });
};

exports.inviteParty = function(user_id, message, callback) {
  if(!message.user) {
    return user.messageUser(user_id, 'You need to choose someone to invite downy.');
  }
  // check if user is in party
  helpers.redis.hget('user_' + user_id, 'party', function(err, party_id) {
    if(err) { callback(err); }
    if(party_id) {
      return user.messageUser(user_id, 'Holy tamoles, this kids already in a party.');
    }
    // send user the invite
    user.messageUser(message.user, user_id + ' wants you to join his party. Confirm/Deny?');
    callback(null);
  })

};

exports.acceptParty = function(user_id, message, callback) {
  if(!message.user) {
    return user.messageUser(user_id, 'You didnt specify whos party genius.');
  }
  // check if user has an existing party
  helpers.redis.hget('user_' + message.user, 'party', function(err, party_id) {
    if(err) { callback(err); }
    if(!party_id) {
      // create a party for these two users
      helpers.createId(function(err, party_id) {
        if(err) { callback(err); }
        redis.lpush('party_' + party_id, [user_id, message.user], function(err) {
          if(err) { callback(err); }
          user.messageUser(message.user, user_id + 'has accepted your party invite');
          user.messageAllUsers([user_id, message.user], 'You are now in party ' + party_id);
          callback(null);
        });
      };
    }
  });
};

exports.rejectParty = function(user_id, message, callback) {
  if(!message.party_id) {

  }
}