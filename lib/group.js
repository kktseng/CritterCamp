var async = require('async'),
    wsHandler = require('./wsHandler'),
    helpers = require('./helpers'),
    redis = helpers.redis,
    user = require('./user');

var messageGroup = exports.messageGroup = function(group_id, message, callback) {
  redis.lrange('group_' + err.success, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    user.messageAllUsers(users, message, callback);
  });
};

var messageGroupStatus = exports.messageGroupStatus = function(group_id, callback) {
  redis.lrange('group_' + group_id, 0, -1, function(err, users) {
    if(err) { return callback(err); }
    user.messageAllUsers(users, 'Group status: ' + users, callback);
  });
};

var getGroup = exports.getGroup = function(username, callback) {
  helpers.redis.hget('user_' + username, 'group', callback);
};

/**
* matches a user or party to a group based on game
* callback(err, group_id of which users were added to)
**/
exports.findGroup = function(usernames, game, callback) {
  var party_size = usernames.length;

  helpers.m.Game.findOne({ game: game }, { maxPartySize: true }, function(err, result) {
    if(err) { return callback(err); }

    // if party size is too large for the game, throw an error immediately
    if(party_size > result.maxPartySize) {
      return callback(new Error('Party is too large for game'));
    }

    var checkAvailability = function(group_id, cb) {
      redis.watch('group_' + group_id); // ensure there are no race conditions
      redis.llen('group_' + group_id, function(err, length) {
        if(err) { return cb(err); }

        if(length + party_size <= result.maxPartySize) {
          var multi = redis.multi();

          usernames.forEach(function(username) {
            multi.rpush('group_' + group_id, username);
          });

          if(length + party_size === result.maxPartySize) {
            // remove the group from queue if full
            multi.srem('queue_' + game, group_id);
          }

          multi.exec(function(err, reply) {
            if(err) { return cb(err); }
            if(reply) { // the group was successfully added onto
              return cb({ success: group_id });
            }
            return cb(); // continue on to next group
          });
        } else {
          return cb();
        }
      });
    }
    async.waterfall([
      async.apply(redis.smembers.bind(redis), 'queue_' + game),
      function(arr, cb) {
        async.forEachSeries(arr, checkAvailability, cb);
      },
      // could not add to any group, so create a new one
      async.apply(helpers.createId),
      function(group_id, cb) {
        async.series([
          async.apply(async.forEach, usernames, function(user, callb) {
            redis.rpush('group_' + group_id, user, callb);
          }),
          function(callb) {
            if(party_size != result.maxPartySize) {
              redis.sadd('queue_' + game, group_id, callb);
            } else {
              callb();
            }
          }
        ], function(err) {
          cb({ success: group_id });
        });
      }
    ], function(err) {
      if(err && err.success) {
        var group_id = err.success;
        // set groups for all users
        async.forEach(usernames, function(username, cb) {
          redis.hset('user_' + username, 'group', group_id, cb);
        }, function(err) {
          return callback(err, group_id);
        });
      } else {
        return callback(err);
      }
    });
  });
};

/**
* removes a user from its group
**/
exports.removeFromGroup = function(username, callback) {
  var group;
  async.waterfall([
    async.apply(getGroup, username),
    function(group_id, cb) {
      redis.lrem('group_' + group_id, 0, username, function(err) {
        if(err) { return cb(err); }
        group = group_id;
        cb();
      });
    },
    async.apply(redis.hdel.bind(redis), 'user_' + username, 'group')
  ], function(err) {
    callback(err, group);
  });
};