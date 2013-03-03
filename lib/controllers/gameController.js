var async = require('async'),
    game = require('../game'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  helpers.m.Game.findOne({ name: message.name }, function(err, game_obj) {
    if(err) { return callback(err); }
    if(game_obj === null) {
      return callback(new Error('No game found for game ' + message.name));
    }
    game[message.name](username, message.data, callback);
  });
}