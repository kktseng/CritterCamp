var async = require('async'),
    crypto = require('crypto'),
    group = require('./group'),
    helpers = require('./helpers'),
    party = require('./party'),
    users = require('./users'),
    wsHandler = require('./wsHandler');

/**
* gets the game object associated with a game
*
* callback(err, game)
**/
function getGame(game, callback) {
  helpers.m.Game.findOne({ name: game }, function(err, game) {
    if(err) { return callback(err); }
    if(game === null) {
      return callback(new Error('No game found for game ' + game));
    }
    callback(null, game);
  });
}

/**
* checks if a given user exists in mongo
*
* callback(err, bool)
**/
function validUser(user, callback) {
  helpers.m.User.findOne({ username: user }, function(err, result) {
    if(err) { return callback(err); }
    return callback(err, (results === null));
  });
}

/**
* checks if a given user is valid and also currently connected to the server
*
* callback(err, bool)
**/
function onlineUser(user, callback) {
  validUser(user, function(err, isValid) {
    if(err) { return callback(err); }
    if(!isValid) {
      return false;
    }
    helpers.redis.exists('user_' + user, callback);
  });
}

/**
* verifies the authorization key based on given parameters
**/
function verify(auth, key, fields) {
  var hash = crypto.createHmac('sha256', key);
  fields.forEach(function(field) {
    hash.update(field);
  });
  return (auth === hash.digest('hex'));
}

exports.login = function(conn_id, message, callback) {
  if(!message.username || !message.password) {
    return callback(new Error('Missing parameters: ' + message));
  }
  helpers.m.User.authenticate(message.username, message.password, function(err, user) {
    if(err) {
      if(err.message === 'User ' + message.username + ' not found') {
        wsHandler.messageConn(conn_id, err.message);
      } else if(err.message === 'Invalid password') {
        wsHandler.messageConn(conn_id, err.message)
      }
      return callback(err);
    }
    helpers.redis.hset('user_' + message.username, 'conn', conn_id, function(err) {
      return callback(err, user);
    });
  });
}

exports.joinGroup = function(username, message, callback) {
  if(!message.game) {
    return callback(new Error('Missing parameters' + message));
  }
  getGame(message.game, function(err, game) {
    if(err) { return callback(err); }
    group.findGroup([username], game, function(err, group_id) {
      if(!err && group_id) {
        return group.messageGroupStatus(group_id, callback);
      }
      callback(err);
    });
  });
};

exports.inviteParty = function(username, message, callback) {
  if(!message.user) {
    return callback(new Error('Missing parameters: ' + message));
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

};

exports.acceptParty = function(username, message, callback) {
  if(!message.user) {
    return callback(new Error('Missing parameters: ' + message));
  }
  party.joinParty(username, message.user, function(err, party_id) {
    if(err) { return callback(err); }
    party.messagePartyStatus(party_id, callback);
  });
};

exports.rejectParty = function(username, message, callback) {
  if(!message.user) {
    return callback(new Error('Missing parameters: ' + message));
  }
  users.messageUser(message.user, username + ' is a twat and rejected your party invite.', callback);
};

exports.removeParty = function(username, message, callback) {
  if(!message.user) {
    return callback(new Error('Missing parameters: ' + message));
  }
  party.removeFromParty(message.user, function(err, party_id) {
    if(err) { return callback(err); }
    async.parallel([
      async.apply(users.messageUser, message.user, 'You have been removed from the party by the almighty ' + username),
      async.apply(party.messagePartyStatus, party_id)
    ], callback);
  });
};

exports.leaveParty = function(username, message, callback) {
  party.removeFromParty(username, function(err, party_id) {
    if(err) { return callback(err); }
    party.messagePartyStatus(party_id, callback);
  });
};