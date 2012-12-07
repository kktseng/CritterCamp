var async = require('async'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  helpers.m.Game.findOne({ name: message.name }, function(err, game) {
    if(err) { return callback(err); }
    if(game === null) {
      return callback(new Error('No game found for game ' + message.name));
    }
    callback(null, game);
  });
}