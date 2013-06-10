var async = require('async'),
    group = require('../group'),
    helpers = require('../helpers'),
    users = require('../users');

/**
* gets the game object associated with a game
*
* callback(err, game)
**/
function getGame(game_name, callback) {
  helpers.m.Game.findOne({ name: game_name }, function(err, game) {
    if(err) { return callback(err); }
    if(game === null) {
      return callback(new Error('No game found for game ' + game_name));
    }
    callback(null, game);
  });
}

module.exports = function(username, message, callback) {
  if(message.type === 'join') {
    group.findGroup([username], function(err, group_id, size) {
      if(!err && group_id) {
        // if group has been filled, tell all group members to start the game
        if(size == globals.MAX_PARTY_SIZE) {
          // find all player info for every user in the group
          async.waterfall([
            function(cb) {
              helpers.redis.lrange('group_' + group_id, 0, -1, cb);
            },
            function(user_list, cb) {
              group.setupGame(user_list, function(err, user_info) {
                cb(err, user_list, user_info)
              });
            },
            function(user_list, user_info, cb) {
              helpers.redis.hget('user_' + username, 'version', function(err, version) {
                cb(err, user_list, user_info, version);
              });
            },
            function(user_list, user_info, version, cb) {
              group.selectGames(version, function(err, selected_games) {
                cb(null, user_list, user_info, selected_games);
              });
            }
          ], function(err, user_list, user_info, selected_games) {
            if(err) { return callback(err); }
            reply = { action: 'group', type: 'ready', users: user_info, vote: selected_games };
            users.messageAllUsers(user_list, JSON.stringify(reply), callback);
          });
        } else {
          group.messageGroupStatus(group_id, callback);
          helpers.redis.multi()
            .hset('user_' + username, 'status', 'searching')
            .expire('user_' + username, globals.REDIS_TIMEOUT)
          .exec(callback);
        }
        callback(err);
      }
    });
  } else if(message.type === 'sync') {
    message.timeout = message.timeout || 5;
    group.getGroup(username, function(err, group_id) {
      if(err) { return callback(err); }
      group.syncGroup(username, group_id, message.data, message.timeout, function(err, reply) {
        if(err) { return callback(err); }
        group.messageGroup(group_id, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'select_game') {
    if(message.game === undefined) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    group.updateGameMetrics(username, message.game, callback);
  } else if(message.type == 'leave') {
    // remove user from their group
    group.removeFromGroup(username, function(err, group_id) {
      if(err) { return callback(err); }
      // change user status from 'searching' to 'online'
      helpers.redis.hset('user_' + username, 'status', 'online', callback);
      group.messageGroupStatus(group_id, callback);
    });
  } else if(message.type === 'report_score') {
    if(message.score === undefined) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    group.getGroup(username, function(err, group_id) {
      if(err) { return callback(err); }
      group.handleScore(username, group_id, message.score, function(err, scores) {
        if(err) { return callback(err); }
        group.messageGroup(group_id, JSON.stringify(scores), function(err) {
          if(err) { return callback(err); }
          group.deleteGroup(group_id, callback);
        });
      });
    });
  }
}