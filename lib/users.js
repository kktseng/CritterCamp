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
}

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
}

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
}

exports.setExp = function(username, exp, callback) {
    // Set exp and level in User model
    helpers.m.User.getUser(username, function(err, user) {
      if(err) { return callback(err); }
      user.exp = exp;

      var old_level = user.level
      var new_level = //calculate level here based on exp
      var level_changed = false;
      if (old_level != new_level) {
        user.level = new_level;
        level_changed = true;
      }
      user.save(function(err) {
        if(err) { return callback(err); }
        if (!level_changed) {
          return callback(null);
        }
        // Change Rank model: find one Rank that corresponds with old level and 
        // one Rank that corresponds with new level and update both (and all in between)
        var change_levels = [];
        for (int i = old_level; i < new_level; i++) {
          change_levels.push(i);
        }
        async.forEach(change_levels, helpers.m.incrRank, function(err) {
          if(err) { return callback(err); }
          // Check if top 10 needs to be updated to include user
          helpers.m.getRank(new_level, function(err, rank) {
            if(err) { return callback(err); }
            if (rank.rank > 10) {
              return callback(null);
            }
            // Update leaderboard
            var new_leader = new helpers.m.Rank({ user: user, rank: rank.rank });
            new_leader.save(function(err) {
              if(err) { return callback(err); }
              helpers.m.Rank.remove({ rank: 11 }, function(err) {
                if(err) { return callback(err); }
                return callback(null);
              })
            });
          });
        });
      });
    });
}

exports.getRank = function(username) {
  // Retrieve User model based on username

  // Retrieve rank by passing user's level to Rank model
}