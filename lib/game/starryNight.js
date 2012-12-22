var group = require('../group'),
    helpers = require('../helpers');

/**
* Starry Night is a simon says type game where users must enter dance moves
* The winner of each game is the one who inputs the least amount of incorrect moves
**/ 
module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = {};
    var game_reply = {};
    reply.action = 'game';
    reply.name = 'starry_night';
    reply.data = game_reply;
    if(message.action === 'command') {
      game_reply.action = 'update';
      game_reply.source = username;
      game_reply.commands = message.commands;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}