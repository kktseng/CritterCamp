var async = require('async'),
    helpers = require('./helpers'),
    globals = require('./globals'),
    users = require('./users');

/**
* messages a party a given message
*
* callback(err)
**/
exports.messageParty = function(party_id, message, callback) {
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    users.messageAllUsers(users, message);
    callback(null);
  });
};

/**
* messages a party a list of all its users
*
* callback(err)
**/
exports.messagePartyStatus = function(party_id, callback) {
  async.parallel([
    async.apply(helpers.redis.lrange.bind(helpers.redis), 'party_' + party_id, 0, -1),
    async.apply(helpers.redis.lrange.bind(helpers.redis), 'party_' + party_id + '_requests', 0, -1)
  ], function(err, results) {
    if(err) { return callback(err); }
    var requests = results[1] || [];
    var userlist = results[0];
    var reply = { action: 'party', type: 'update', requests: requests, list: userlist };
    users.messageAllUsers(userlist, JSON.stringify(reply), callback);
  });
};

/**
* gets the party associated with a user
*
* callback(err, party_id)
**/
var getParty = exports.getParty = function(username, callback) {
  helpers.redis.hget('user_' + username, 'party', callback);
};

/**
* gets all members of a users party
*
* callback(err, [ members ])
**/
var getPartyMembers = exports.getPartyMembers = function(username, callback) {
  getParty(username, function(err, party_id) {
    if(err) { return callback(err); }
    helpers.redis.lrange('party_' + party_id, 0, -1, callback);
  });
}

/**
* returns true if users are in same party
*
* callback(err, same_party)
**/
exports.sameParty = function(username1, username2, callback) {
  async.parallel([
    async.apply(getParty, username1),
    async.apply(getParty, username2)
  ], function(err, results) {
    if(err) { return callback(err); }
    if(results[0] == null) { return callback(err, false); }
    return callback(null, results[0] === results[1]);
  });
};

/**
* checks if a user is the party leader (determined by first in party array)
*
* callback(err, true/false)
**/
exports.isPartyLeader = function(username, callback) {
  getPartyMembers(username, function(err, party) {
    if(err) { return callback(err); }
    if(party == null) { return callback(null, false); }
    callback(err, party[0] === username);
  });
}

/**
* adds a user to a party's request list
*
* callback(err, party_id)
**/
exports.requestParty = function(username, user_requested, callback) {
  getParty(user_requested, function(err, party_id) {
    if(err) { return callback(err); }
    redis.multi()
      .lpush('party_' + party_id + '_requests', username)
      .expire('party_' + party_id + '_requests', globals.REDIS_TIMEOUT)
    .exec(function(err) {
      return callback(err, party_id);
    });
  });
};

/**
* joins user_to_join to username's party
*
* callback(err, party_id)
**/
exports.joinParty = function(username, user_to_join, callback) {
  async.parallel([
    async.apply(getParty, username),
    async.apply(getParty, user_to_join)
  ], function(err, results) {
    if(err) { return callback(err); }
    // check if accepting user is a party
    if(results[0]) {
      return callback(new Error('User already in a party'));
    // check if user_to_join has an existing party
    } else if(results[1]) {
      var party_id = results[1];
      helpers.redis.multi()
        .hset('user_' + username, 'party', party_id)
        .rpush('party_' + party_id, username)
        .expire('user_' + username, globals.REDIS_TIMEOUT)
        .expire('party_' + party_id, globals.REDIS_TIMEOUT)
        .exec(function(err) {
          if(err) { return callback(err); }
          callback(err, party_id);
        });
    } else {
      // create a new id for the party
      helpers.createId(function(err, party_id) {
        if(err) { return callback(err); }
        helpers.redis.multi()
          .rpush('party_' + party_id, username, user_to_join)
          .hset('user_' + user_to_join, 'party', party_id)
          .hset('user_' + username, 'party', party_id)
          .expire('party_' + party_id, globals.REDIS_TIMEOUT)
          .expire('user_' + user_to_join, globals.REDIS_TIMEOUT)
          .expire('user_' + username, globals.REDIS_TIMEOUT)
          .exec(function(err) {
            if(err) { return callback(err); }
            callback(err, party_id);
          });
      });
    }
  });
};

/**
* removes user from its party.
* if user is not in a party, cb(err, -1) is returned
* cb(err, party_id)
**/
exports.removeFromParty = function(username, callback) {
  getParty(username, function(err, party_id) {
    if(err || !party_id) { return callback(err, -1); }
    helpers.redis.multi()
      .lrem('party_' + party_id, 0, username)
      .hdel('user_' + username, 'party')
    .exec(function(err) {
      callback(err, party_id);
    });
  });
};