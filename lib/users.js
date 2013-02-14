var async = require('async'),
    helpers = require('./helpers'),
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
      return logger.error('No connection found for this user');
    }
    connection.messageConn(conn_id, message, callback);
  });
};

exports.messageAllUsers = function(users, message, callback) {
  async.forEach(users, function(user, cb) {
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
      async.apply(helpers.redis.hset.bind(helpers.redis), 'user_' + username, 'status', status),
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

exports.setGold = function(username, gold, callback) {
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    user.gold = gold;
    user.save(callback);
  });
};

// assumption: User can only increase one level at a time
exports.setExp = function(username, exp, callback) {
  // set exp and level in User model
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    user.exp = exp;
    var old_level = user.level
    helpers.m.Rank.getRank(old_level, function(err, old_rank) {
      if(err) { return callback(err); }
      old_rank.players--;
      old_rank.save(function(err) {
        if(err) { return callback(err); }
        var new_level = helpers.m.Rank.calculateLevel(exp);
        if(new_level == -1) {
          return callback(new Error('Exp does not correspond to a level'));
        }
        var level_changed = false;
        if(old_level != new_level) {
          user.level = new_level;
          level_changed = true;
        }
        user.save(function(err) {
          if(err) { return callback(err); }
          if (!level_changed) {
            return callback(null);
          }

          /**
          * change Rank model: find one Rank that corresponds with old level and 
          * one Rank that corresponds with new level and update both (and all in between)
          **/
          var change_levels = [];
          for (var i = old_level; i < new_level; i++) {
            change_levels.push(i);
          }
          // find number of leaders in leaderboard
          var num_leaders = 0;
          var max_leaders = 10;
          helpers.m.Rank.count({}, function(err, rank_count) {
            if(err) { return callback(err); }
            var leaderboard_size = rank_count;
            if(leaderboard_size > max_leaders) {
              leaderboard_size = max_leaders;
            }
            // creates new entry in leaderboard
            var create_new_leader = function(leader_id, cb) {
              var new_leader = new helpers.m.Leader({ user: leader_id._id, rank: num_leaders+1 });
              new_leader.save(cb);
            }
            // adds entries to leaderboard and keeps track of how many leaders are in leaderboard
            var update_leaderboard = function(callb) {
              helpers.m.Rank.getLevel(num_leaders+1, function(err, level) {
                if(err) { return callb(err); }
                helpers.m.User.getIdFromLevel(level, function(err, results) {
                  if(err) { return callb(err); }
                  async.forEach(results, create_new_leader, function(err) {
                    if(err) { return callb(err); }
                    num_leaders += results.length;
                    return callb(null);
                  });
                });
              });
            };
            async.forEach(change_levels, helpers.m.Rank.incrRank, function(err) {
              if(err) { return callback(err); }
              // check if top 10 needs to be updated to include user
              helpers.m.Rank.getRank(new_level, function(err, rank) {
                if(err) { return callback(err); }
                if(!rank) {
                  var new_rank = new helpers.m.Rank({ rank: 1, level: new_level });
                  new_rank.save(function(err) {
                    if(err) { return callback(err); }
                    // flush old leaderboard
                    helpers.m.Leader.remove({}, function(err) {
                      if(err) { return callback(err); }
                      // get new leaderboard
                      async.whilst(
                        function() { return num_leaders <= leaderboard_size },
                        update_leaderboard, 
                        callback);
                    });
                  });
                } else if (rank.rank > max_leaders) {
                  rank.players++;
                  rank.save(callback);
                } else {
                  rank.players++;
                  rank.save(function(err) {
                    if(err) { return callback(err); }
                    // flush old leaderboard
                    helpers.m.Leader.remove({}, function(err) {
                      if(err) { return callback(err); }
                      // get new leaderboard
                      async.whilst(
                        function() { return num_leaders <= leaderboard_size },
                        update_leaderboard, 
                        callback);
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  });
};

exports.getRank = function(username, callback) {
  // retrieve User model based on username
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    // retrieve rank object by passing user's level to Rank model
    helpers.m.Rank.getRank(user.level, function(err, rank) {
      if(err) { return callback(err); }
      return callback(null, rank);
    });
  });
};