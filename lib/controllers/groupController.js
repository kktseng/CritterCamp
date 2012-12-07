var async = require('async'),
    group = require('../group'),
    helpers = require('../helpers');

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
  if(!message.game) {
    return callback(new Error('Missing parameters' + message));
  }
  getGame(message.game, function(err, game) {
    if(err) { return callback(err); }
    group.findGroup([username], game, function(err, group_id) {
      if(!err && group_id) {
        return group.messageGroupStatus(group_id, callback);
      }
      callback(err);
    });
  });
}