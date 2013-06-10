var async = require('async'),
    game = require('../game'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  if(message.type == 'single') {
    helpers.m.User.getUser(username, function(err, user) {
      if(err) { return callback(err); }
      user.totalSP++;
      user.save(callback);
    });
  } else {
    helpers.m.Game.findOne({ name: message.name }, function(err, game_obj) {
      if(err) { return callback(err); }
      if(game_obj === null) {
        logger.warn('Invalid game packet: ' + JSON.stringify(message));
        return callback(null);
      }
      game[message.name](username, message.data, callback);
    });
  }
}