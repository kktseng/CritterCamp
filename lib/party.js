var helpers = require('./helpers'),
    user = require('./user');

exports.messageParty = function(party_id, message, callback) {
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    user.messageAllUsers(users, message);
    callback(null);
  });
};

exports.messagePartyStatus = function(party_id, callback) {
  helpers.redis.lrange('party_' + party_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    user.messageAllUsers(users, 'Party status: ' + users);
    callback(null);
  });
};

var getParty = exports.getParty = function(username, callback) {
  helpers.redis.hget('user_' + username, 'party', callback);
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
        callback(err, party_id)
      });
  });
};