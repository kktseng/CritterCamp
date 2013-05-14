var async = require('async'),
    helpers = require('./helpers'),
    globals = require('./globals'),
    logger = require('./logger'),
    connection = require('./connection');

function mapStatus(status) {
  var statuses = ['online', 'in-party', 'searching', 'in-game'];
  for(var i = 0; i < statuses.length; i++) {
    if(statuses[i] === status)
      return i;
  }
};

var messageUser = exports.messageUser = function(username, message, callback) {
  // find the connection associated with username
  helpers.redis.hget('user_' + username, 'conn', function(err, conn_id) {
    if(err) { return logger.error(err); }

    if(!conn_id) {
      return logger.error(new Error('No connection found for this user'));
    }
    connection.messageConn(conn_id, message, callback);
  });
};

exports.messageAllUsers = function(users, message, callback) {
  async.each(users, function(user, cb) {
    messageUser(user, message, cb);
  }, callback);
};

var getStatus = exports.getStatus = function(username, callback) {
  helpers.redis.hget('user_' + username, 'status', function(err, status) {
    if(err) { return callback(err); }
    if(!status) {
      status = 'offline';
    }
    callback(null, status);
  });
};

exports.setStatus = function(username, status, callback) {
  getStatus(username, function(err, current_status) {
    if(err) { return callback(err); }
    if (mapStatus(current_status) >= mapStatus(status)) { 
      return callback(); 
    }
    var result = { action: 'friend', type: 'update', user: { username: username, status: status } };
    async.waterfall([
      function(cb) {
        helpers.redis.multi()
          .hset('user_' + username, 'status', status)
          .expire('user_' + username, globals.REDIS_TIMEOUT)
        .exec(cb);
      },
      async.apply(helpers.m.User.getUser, username),
      function(user, cb) {
        user.getFriendNames(cb);
      },
      function(friends, cb) {
        messageAllUsers(friends, result, cb);
      }
    ], callback);
  });
};

var setGold = exports.setGold = function(username, gold, callback) {
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    user.gold = gold;
    user.save(callback);
  });
};


// check if top 10 needs to be updated to include user with new_level 
var checkLeaderboard = function(new_level, callback) {
  var num_leaders = 0;

  // creates new entry in leaderboard
  var create_new_leader = function(leader_id, callb) {
    var new_leader = new helpers.m.Leader({ user: leader_id._id, rank: num_leaders + 1 });
    new_leader.save(callb);
  };

  // adds entries to leaderboard and keeps track of how many leaders are in leaderboard
  var populate_leaderboard = function(callb) {
    async.waterfall([
      function(cb) {
        helpers.m.Rank.getLevel(num_leaders + 1, cb);
      },
      function(level, cb) {
        helpers.m.User.getIdFromLevel(level, cb);
      },
      function(results, cb) {
        async.each(results, create_new_leader, function(err) {
          cb(err, results);
        });
      },
      function(results, cb) {
        num_leaders += results.length;
        cb(null);
      }
    ], callb);
  };

  // flushes old leaderboard and populates new leaderboard
  var update_leaderboard = function(callb) {
    // flush old leaderboard
    helpers.m.Leader.remove({}, function(err) {
      if(err) { return callb(err); }
      // get new leaderboard
      async.whilst(function() {
        return num_leaders < globals.MAX_LEADERS
      }, populate_leaderboard, callb);
    });
  };

  helpers.m.Rank.getRank(new_level, function(err, rank) {
    if(err) { return callback(err); }
    if(!rank) {
      helpers.pollLock('leaderboard', function(callb) {
        helpers.pollCheckLock('rank_update', function(cb) {
          helpers.m.Rank.update({ rank: 1, level: new_level }, { $inc: { players: 1 }}, { safe: true, upsert: true }, function(err, results) {
            if(err) { return cb(err); }
            update_leaderboard(cb);
          });
        }, 100, callb);
      }, 100, 3, callback);
    } else if (rank.rank > globals.MAX_LEADERS) {
      helpers.m.Rank.update({ level: new_level }, { $inc: { players: 1 }}, { multi: true }, callback);
    } else {
      helpers.pollLock('leaderboard', function(callb) {
        helpers.pollCheckLock('rank_update', function(cb) {
          helpers.m.Rank.update({ level: new_level }, { $inc: { players: 1 }}, { multi: true }, function(err, results) {
            if(err) { return cb(err); }
            update_leaderboard(cb);
          });
        }, 100, callb);
      }, 100, 3, callback);
    }
  });
};

/**
* change Rank model: find one Rank that corresponds with old level and 
* one Rank that corresponds with new level and update both (and all in between)
*
* TODO: if this is to update all ranks, checkLeaderboard should be run at each step to enforce the lock
* however, since we can only lvl up 1 at a time, this is not an issue
**/
var updateRanks = function(old_level, new_level, callback) {
  var change_levels = [];
  for (var i = old_level; i < new_level; i++) {
    change_levels.push(i);
  }
  helpers.pollCheckLock('leaderboard', function(callb) {
    helpers.acquireLock('rank_update', 1, function(err, obtained) {
      if(err) { return callb(err); }
      // ignore if obtained since these operations can be done in parallel
      async.each(change_levels, helpers.m.Rank.incrRank, function(err) {
        if(err) { return callb(err); }
        // check if the leaderboard needs to be updated
        checkLeaderboard(new_level, callb);
      });
    });
  }, 100, callback);
};

/**
* sets exp and level of user, updates rank objects and updates leaderboard
* assumption: User can only increase one level at a time
**/
var setExp = exports.setExp = function(username, exp, callback) {
  // set exp and level in User model
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    user.exp = exp;
    var old_level = user.level;
    helpers.m.Rank.getRank(old_level, function(err, old_rank) {
      if(err) { return callback(err); }
      var new_level = helpers.m.Rank.calculateLevel(exp);
      if(new_level === -1) {
        return callback(new Error('Exp does not correspond to a level'));
      }
      var level_changed = false;
      if(old_level !== new_level) {
        user.level = new_level;
        level_changed = true;
      }
      user.save(function(err) {
        if(err) { return callback(err); }
        // if level hasn't changed, we're done
        if (!level_changed) {
          return callback(null, user);
        }
        // decrement number of players at old level
        helpers.m.Rank.update({ level: old_level }, { $inc: { players: -1 }}, { multi: true }, function(err, results) {
          if(err) { return callback(err); }
          // update rank objects to reflect updated user
          updateRanks(old_level, new_level, function(err) {
            if(err) { return callback(err); }
            callback(null, user);
          });
        });
      });
    });
  });
};

exports.getRank = function(username, callback) {
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    // retrieve rank object by passing user's level to Rank model
    helpers.m.Rank.getRank(user.level, function(err, rank) {
      return callback(err, rank);
    });
  });
};

exports.updateResults = function(username, exp_gained, gold_gained, callback) {
  async.waterfall([
    async.apply(helpers.m.User.getUser, username),
    function(user, cb) {
      setExp(username, user.exp + exp_gained, cb);
    },
    function(updated_user, cb) {
      setGold(username, updated_user.gold + gold_gained, function(err) {
        return cb(err, updated_user);
      });
    }
  ], function(err, updated_user) {
    return callback(err, updated_user.level, globals.EXP_TO_LEVEL[updated_user.level - 1], globals.EXP_TO_LEVEL[updated_user.level], updated_user.exp);
  });
};