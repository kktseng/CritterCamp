var async = require('async'),
    group = require('../group'),
    helpers = require('../helpers');

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