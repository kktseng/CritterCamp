var async = require('async'),
    wsHandler = require('./wsHandler'),
    helpers = require('./helpers'),
    redis = helpers.redis,
    user = require('./user');

var GROUP_SIZE = 3; // PUT THIS IN A CONFIG FOR ALL GAMES LATER

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

/**
* matches a user or party to a group based on game
* callback(err, group_id of which user_id was added to)
**/
exports.findGroup = function(user_id, game, callback) {
  var party_size = user_id.length;

  var checkAvailability = function(group_id, cb) {
    redis.watch('group_' + group_id); // ensure there are no race conditions
    redis.llen('group_' + group_id, function(err, length) {
      if(err) { return cb(err); }

      if(length + party_size <= GROUP_SIZE) {
        var multi = redis.multi();

        for(var i = 0; i < user_id.length; i++) {
          // add all members to group
          multi.rpush('group_' + group_id, user_id[i]);
        }

        if(length + party_size === GROUP_SIZE) {
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
        async.apply(async.forEach, user_id, function(user, callb) {
          redis.rpush('group_' + group_id, user, callb);
        }),
        async.apply(redis.sadd.bind(redis), 'queue_' + game, group_id)
      ], function(err) {
        cb({ success: group_id });
      });
    }
  ], function(err, result) {
    if(err && err.success) {
      var group_id = err.success;
      redis.hset('user_' + user_id, 'group', group_id, function(err) {
        return callback(err, group_id);
      });
    } else {
      return callback(err);
    }
  });
};

/**
* removes a user from its group
**/
exports.removeFromGroup = function(user_id, callback) {
  async.waterfall([
    async.apply(redis.hget.bind(redis), 'user_' + user_id, 'group'),
    function(group_id, cb) {
      redis.lrem('group_' + group_id, 0, user_id, function(err) {
        if(err) { return cb(err); }
        messageGroupStatus(group_id, cb);
      });
    },
    async.apply(redis.hdel.bind(redis), 'user_' + user_id, 'group')
  ], callback);
};