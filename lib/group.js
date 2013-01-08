var async = require('async'),
    helpers = require('./helpers'),
    redis = helpers.redis,
    users = require('./users');

/**
* waits for all players in a group to send a packet, then executes a final function
* all data send in each packet is aggregated and sent to the final function
*
* callback(err)
*/
function sync(group_id, data, final, callback) {
  helpers.redis.multi()
    .llen('group_' + group_id)
    .rpush('group_' + group_id + '_sync', JSON.stringify(data))
    .expire('group_' + group_id + '_sync', 30)
  .exec(function(err, reply) {
    if(err) { return callback(err); }
    // all players synced
    if(reply[0] === reply[1]) {
      helpers.redis.multi()
        .lrange('group_' + group_id + '_sync', 0, -1)
        .del('group_' + group_id + '_sync')
      .exec(function(err, reply) {
        console.log('reply: ' + reply);
        if(err) { return callback(err); }
        final(reply[0], callback);
      });
    }
  });
}

/**
* messages a group a given message
*
* callback(err)
**/
var messageGroup = exports.messageGroup = function(group_id, message, callback) {
  redis.lrange('group_' + group_id, 0, -1, function(err, user_list) {
    if(err) { return callback(err); }
    users.messageAllUsers(user_list, message, callback);
  });
};

/**
* messages a group a list of its users
*
* callback(err)
**/
exports.messageGroupStatus = function(group_id, callback) {
  redis.lrange('group_' + group_id, 0, -1, function(err, user_list) {
    if(err) { return callback(err); }
    var reply = { action: 'group', users: user_list };
    users.messageAllUsers(user_list, JSON.stringify(reply), callback);
  });
};

/**
* finds a group based on username
*
* callback(group_id)
**/
var getGroup = exports.getGroup = function(username, callback) {
  helpers.redis.hget('user_' + username, 'group', callback);
};

/**
* syncs and sends back all aggregated sync data
*
* callback(err)
*/
exports.syncGroup = function(group_id, data, callback) {
  sync(group_id, data, function(reply, cb) {
    var aggregated = [];
    reply.forEach(function(s) {
      aggregated.push(JSON.parse(s));
    });
    var reply = { action: 'group', type: 'synced', data: aggregated };
    cb(null, reply);
  }, callback);
}

/**
* sorts score by majority rules and sends back final product
*
* callback(err)
*/
exports.handleScore = function(group_id, score_data, callback) {
  sync(group_id, score_data, function(scores, cb) {
    score_map = {};
    scores.forEach(function(score) {
      score = JSON.parse(score);
      for(var username in score) {
        if(!score_map[username]) {
          score_map[username] = [];
        }
        score_map[username].push(score[username]);
      }
    });
    var reply = { action: 'score', scores: [] };
    for(var user in score_map) {
      var sorted = score_map[user].sort();
      var score_packet = { username: user }
      if(sorted.length < 3) {
        score_packet.score = sorted[sorted.length - 1];
      } else if(sorted[1] === sorted[2]) {
        score_packet.score = sorted[2];
      } else if(sorted[0] === sorted[1]) {
        score_packet.score = sorted[1];
      } else score_packet.score = sorted[sorted.length - 1];
      reply.scores.push(score_packet);
    }
    cb(null, reply);
  }, callback);
}

/**
* matches a user or party to a group based on game
*
* callback(err, group_id, isFull)
**/
exports.findGroup = function(usernames, game, callback) {
  var party_size = usernames.length;

  // if party size is too large for the game, throw an error immediately
  if(party_size > game.maxPartySize) {
    return callback(new Error('Party is too large for game'));
  }

  var checkAvailability = function(group_id, cb) {
    redis.watch('group_' + group_id); // ensure there are no race conditions
    redis.llen('group_' + group_id, function(err, length) {
      if(err) { return cb(err); }

      if(length + party_size <= game.maxPartySize) {
        var multi = redis.multi();

        usernames.forEach(function(username) {
          multi.rpush('group_' + group_id, username);
        });

        var isFull;
        if(length + party_size === game.maxPartySize) {
          // remove the group from queue if full
          multi.srem('queue_' + game.name, group_id);
          isFull = true;
        } else {
          isFull = false;
        }

        multi.exec(function(err, reply) {
          if(err) { return cb(err); }
          if(reply) { // the group was successfully added onto
            return cb({ success: group_id, full: isFull });
          }
          return cb(); // continue on to next group
        });
      } else {
        return cb();
      }
    });
  };

  async.waterfall([
    async.apply(redis.smembers.bind(redis), 'queue_' + game.name),
    function checkOpenGroups(arr, cb) {
      async.forEachSeries(arr, checkAvailability, cb);
    },
    // could not add to any group, so create a new one
    async.apply(helpers.createId),
    function insertInGroup(group_id, cb) {
      async.series([
        async.apply(async.forEach, usernames, function(user, callb) {
          redis.rpush('group_' + group_id, user, callb);
        }),
        function addToQueue(callb) {
          if(party_size != game.maxPartySize) {
            redis.sadd('queue_' + game.name, group_id, function(err) {
              if(err) { return callb(err); }
              callb(null, false);
            });
          } else {
            callb(null, true);
          }
        }
      ], function(err, results) {
        if(err) { return cb(err); }
        cb({ success: group_id, full: results[1] });
      });
    }
  ], function(err) {
    if(err && err.success) {
      var group_id = err.success;
      var isFull = err.full;
      // set groups for all users
      async.forEach(usernames, function(username, cb) {
        redis.hset('user_' + username, 'group', group_id, cb);
      }, function(err) {
        return callback(err, group_id, isFull);
      });
    } else {
      return callback(err);
    }
  });
};

/**
* removes a user from its group
*
* callback(err, group_id)
**/
exports.removeFromGroup = function(username, callback) {
  var group = null;
  async.waterfall([
    async.apply(getGroup, username),
    function(group_id, cb) {
      if(!group_id) { return cb(); }
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