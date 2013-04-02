var async = require('async'),
    helpers = require('./helpers'),
    globals = require('./globals'),
    connection = require('./connection'),
    party = require('./party'),
    redis = helpers.redis,
    users = require('./users');

/**
* removes user information from redis and kills connection
*
* callback(err)
*/
var disconnectUser = function disconnectUser(username, callback) {
  async.waterfall([
    async.apply(party.removeFromParty, username),
    function(party_id, callback) {
      removeFromGroup(username, callback);
    },
    function(group_id, callback) {
      helpers.redis.del('username_' + username, callback);
    }
  ], function(err) {
    if(err) { return logger.error(err); }
    // kill user's connection
    connection.endConn(username, callback);
  });
};

/**
* waits for all players in a group to send a packet, then executes a final function
* all data sent in each packet is aggregated and sent to the final function
*
* callback(err)
*/
function sync(username, group_id, data, timeout, process, callback) {
  helpers.redis.multi()
    .llen('group_' + group_id)
    .rpush('group_' + group_id + '_sync_users', username)
    .rpush('group_' + group_id + '_sync_data', JSON.stringify(data))
    .expire('group_' + group_id + '_sync_data', timeout + 5)
  .exec(function(err, reply) {
    if(err) { return callback(err); }

    // sends reply to all synced users
    function sendReply(cb) {
      helpers.redis.multi()
        .lrange('group_' + group_id + '_sync_data', 0, -1)
        .del('group_' + group_id + '_sync_users')
        .del('group_' + group_id + '_sync_data')
        .incr('group_' + group_id + '_sync_id')
      .exec(function(err, reply) {
        console.log('reply: ' + reply);
        if(err) { return cb(err); }
        process(reply[0], cb);
      });
    }

    // get all users who haven't synced
    function getNonSyncUsers(cb) {
      helpers.redis.lrange('group_' + group_id, 0, -1, function(err, group_users) {
        if(err) { return cb(err); }
        helpers.redis.lrange('group_' + group_id + '_sync_users', 0, -1, function(err, sync_users) {
          if(err) { return cb(err); }
          var remove_users = [];
          group_users.forEach(function(username) {
            for(var i = 0; i < sync_users.length; i++) {
              if(sync_users[i] === username) {
                break;
              }
              if(i === sync_users.length-1) {
                remove_users.push(username);
              }
            }
          });
          return cb(null, remove_users);
        });
      });
    };

    // all players synced
    if(reply[0] === reply[1]) {
      sendReply(callback);
    } else {
      // only trigger timeout for first person
      if(reply[1] === 1) {
        helpers.redis.multi()
          .incr('group_' + group_id + '_sync_id')
          .expire('group_' + group_id + '_sync_id', timeout + 5)
        .exec(function(err, reply) {
          if(err) { return callback(err); }
          var sync_id = reply[0];
          console.log("setting syncid: " + sync_id);
          // set a timeout in case a user lags out
          setTimeout(function() {
            getNonSyncUsers(function(err, remove_users) {
              if(err) { return callback(err); }
              async.forEach(remove_users, disconnectUser, function(err) {
                if(err) { return callback(err); }
                helpers.redis.get('group_' + group_id + '_sync_id', function(err, val) {
                  if(err) { return callback(err); }
                  console.log(val + " " + sync_id);
                  if(val == sync_id) {
                    sendReply(callback);
                  }
                });
              });
            });
          }, timeout * 1000);
        });
      }
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
* messages a group a list of its users. NOTE: THIS FUNCTION IS OUTDATED!
*
* callback(err)
**/
exports.messageGroupStatus = function(group_id, callback) {
  redis.lrange('group_' + group_id, 0, -1, function(err, user_list) {
    if(err) { return callback(err); }
    var reply = { action: 'group', type: 'update', users: user_list };
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
exports.syncGroup = function(username, group_id, data, timeout, callback) {
  sync(username, group_id, data, timeout, function(reply, cb) {
    var aggregated = [];
    reply.forEach(function(s) {
      aggregated.push(JSON.parse(s));
    });
    var reply = { action: 'group', type: 'synced', data: aggregated, rand: Math.random() };
    cb(null, reply);
  }, callback);
}

/**
* sorts score by majority rules and sends back final product
*
* callback(err)
*/
exports.handleScore = function(username, group_id, score_data, callback) {
  sync(username, group_id, score_data, 10, function(scores, cb) {
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
* retrieves user_info, updates metrics and sets user status to in-game
*
* callback(err, user_info)
**/
exports.setupGame = function(usernames, callback) {
  var user_info = [];
  async.forEach(usernames, function(username, callb) {
    async.waterfall([
      function getInfo(cb) {
        helpers.m.User.getId(username, function(err, id) {
          if(err) { return cb(err); }
          helpers.m.User.getUserInfo(id, function(err, info) {
            user_info.push(info);
            cb(err);
          });
        });
      },
      function setStatus(cb) {
        helpers.redis.multi()
          .hset('user_' + username, 'status', 'in-game')
          .expire('user_' + username, globals.REDIS_TIMEOUT)
        .exec(cb);
      },
      function updateUserMetrics(results, cb) {
        helpers.m.User.getUser(username, function(err, user) {
          if(err) { return cb(err); }
          user.totalGames++;
          user.save(cb);
        });
      },
    ], callb);
  }, function(err) {
    return callback(err, user_info);
  });
};

/**
* matches a user or party to a group based on game
*
* callback(err, group_id, isFull)
**/
exports.findGroup = function(usernames, callback) {
  var party_size = usernames.length;
  redis.hget('user_' + usernames[0], 'version', function(err, version) {
    if(err) { return callback(err); }

    // if party size is too large for the game, throw an error immediately
    if(party_size > globals.MAX_PARTY_SIZE) {
      return callback(new Error('Party is too large for game'));
    }

    var checkAvailability = function(group_id, cb) {
      redis.watch('group_' + group_id); // ensure there are no race conditions
      redis.llen('group_' + group_id, function(err, length) {
        if(err) { return cb(err); }

        if(length + party_size <= globals.MAX_PARTY_SIZE) {
          var multi = redis.multi();

          usernames.forEach(function(username) {
            multi.rpush('group_' + group_id, username);
            multi.expire('group_' + group_id, globals.REDIS_TIMEOUT);
          });

          var isFull;
          if(length + party_size === globals.MAX_PARTY_SIZE) {
            // remove the group from queue if full
            multi.srem('queue_' + version, group_id);
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
      async.apply(redis.smembers.bind(redis), 'queue_' + version),
      function checkOpenGroups(arr, cb) {
        async.forEachSeries(arr, checkAvailability, cb);
      },
      // could not add to any group, so create a new one
      async.apply(helpers.createId),
      function insertInGroup(group_id, cb) {
        async.series([
          async.apply(async.forEach, usernames, function(user, callb) {
            redis.multi()
              .rpush('group_' + group_id, user)
              .expire('group_' + group_id, globals.REDIS_TIMEOUT)
            .exec(callb);
          }),
          function addToQueue(callb) {
            if(party_size != globals.MAX_PARTY_SIZE) {
              redis.multi()
                .sadd('queue_' + version, group_id)
                .expire('queue_' + version, globals.REDIS_TIMEOUT)
              .exec(function(err) {
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
          redis.multi()
            .hset('user_' + username, 'group', group_id)
            .expire('user_' + username, globals.REDIS_TIMEOUT)
          .exec(cb);
        }, function(err) {
          return callback(err, group_id, isFull);
        });
      } else {
        return callback(err);
      }
    });
  });
};

/**
* selects set of globals.VOTE_GAMES random games that are available in version for group to vote on
*
* callback(err, selected_games)
**/
exports.selectGames = function(version, callback) {
  helpers.m.Game.find({ minVersion: { $lte: version } }, { name: true }, function(err, results) {
    if(err) { return callback(err); }
    // select globals.VOTE_GAMES from potential games
    var current_length = results.length;

    //put game names into array
    var game_names = [];
    results.forEach(function(result) {
      game_names.push(result.name);
    });

    for(var i = 0; i < globals.VOTE_GAMES; i++) {
      var selected = Math.floor(Math.random() * current_length);

      // swap selected game with last element in array
      var temp = game_names[current_length-1];
      game_names[current_length-1] = game_names[selected];
      game_names[selected] = temp;

      current_length--;
    }
    return callback(null, game_names.slice(current_length, game_names.length));
  });
};

/**
* updates metrics for individual games
*
* callback(err)
**/
exports.updateGameMetrics = function(username, game_name, callback) {
  helpers.redis.multi()
    .incr('game_stat_' + game_name + '_count')
    .sadd('game_stat_' + game_name + '_users', username)
    .expire('game_stat_' + game_name + '_count' + globals.REDIS_TIMEOUT)
    .expire('game_stat_' + game_name + '_users' + globals.REDIS_TIMEOUT)
  .exec(callback);
};

/**
* removes a user from its group
*
* callback(err, group_id)
**/
var removeFromGroup = exports.removeFromGroup = function(username, callback) {
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

/**
* deletes group and clears users' group field
*
* callback(err)
**/
exports.deleteGroup = function(group_id, callback) {
  redis.lrange('group_' + group_id, 0, -1, function(err, user_list) {
    if(err) { return callback(err); }
    async.forEach(user_list, function(username, cb) {
      redis.hdel('user_' + username, 'group', cb);
    }, function(err) {
      if(err) { return callback(err); }
      helpers.redis.del('group_' + group_id, function(err) {
        if(err) { return callback(err); }
        helpers.redis.exists('group_' + group_id + '_sync_id', function(err, result) {
          if(err) { return callback(err); }
          if(result === 1) {
            helpers.redis.del('group_' + group_id + '_sync_id', callback);
          } else {
            return callback(null);
          }
        });
      });
    });
  });
};
