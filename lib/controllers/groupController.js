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
    if(!message.game) {
      return callback(new Error('Missing parameters' + message));
    }
    getGame(message.game, function(err, game) {
      if(err) { return callback(err); }
      group.findGroup([username], game, function(err, group_id, isFull) {
        if(!err && group_id) {
          group.messageGroupStatus(group_id, callback);
          // if group has been filled, tell all group members to start the game
          if(isFull) {
            // find usernames for every user in the group
            helpers.redis.lrange('group_' + group_id, 0, -1, function(err, user_list) {
              if(err) { return callback(err); }
              reply = { 'action': 'start_game', 'players': user_list };
              users.messageAllUsers(user_list, JSON.stringify(reply), callback);     
            });
          }
        }
        callback(err);
      });
    });
  } else if(message.type === 'sync') {
    message.timeout = message.timeout || 5;
    group.getGroup(username, function(err, group_id) {
      if(err) { return callback(err); }
      group.syncGroup(group_id, message.data, message.timeout, function(err, reply) {
        if(err) { return callback(err); }
        group.messageGroup(group_id, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type === 'report_score') {
    if(!message.score) {
      return callback(new Error('Missing parameters: ' + JSON.stringify(message)));
    }
    group.getGroup(username, function(err, group_id) {
      if(err) { return callback(err); }
      group.handleScore(group_id, message.score, function(err, scores) {
        if(err) { return callback(err); }
        group.messageGroup(group_id, JSON.stringify(scores), callback);
      });
    });
  }
}