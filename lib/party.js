var async = require('async'),
    helpers = require('./helpers'),
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
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, userlist) {
    if(err) { return callback(err); }
    users.messageAllUsers(userlist, 'Party status: ' + userlist);
    callback(null);
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
* if user is not in a party, cb() is returned
* cb(err, party_id)
**/
exports.removeFromParty = function(username, callback) {
  getParty(username, function(err, party_id) {
    if(err || !party_id) { return callback(err); }
    helpers.redis.multi()
      .lrem('party_' + party_id, 0, username)
      .hdel('user_' + username, 'party')
      .exec(function(err) {
        callback(err, party_id);
      });
  });
};