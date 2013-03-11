var group = require('../group'),
    helpers = require('../helpers');

/**
* Starry Night is a simon says type game where users must enter dance moves
* The winner of each game is the one who inputs the least amount of incorrect moves
**/ 
module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = { data: {} };
    reply.action = 'game';
    reply.name = 'starry_night';
    if(message.action === 'command') {
      reply.data.action = 'update';
      reply.data.source = username;
      reply.data.commands = message.commands;
    } else if(message.action === 'exploded') {
      reply.data.action = 'exploded';
      reply.data.source = username;
    }
    group.messageGroup(group_id, JSON.stringify(reply), callback);
  });
}