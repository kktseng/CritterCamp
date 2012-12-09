var group = require('../group'),
    helpers = require('../helpers');

function sync(group_id, command, callback) {
  // find number of users in current group
  helpers.redis.multi()
    .llen('group_' + group_id)
    .incr('group_' + group_id + '_sync')
  .exec(function(err, reply) {
    if(err) { return callback(err); }
    // all players synced
    if(reply[0] === reply[1]) {
      helpers.redis.del('group_' + group_id + '_sync', callback);
      command();
    }
  });
}

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
    if(message.action === 'sync_command') {
      sync(group_id, function() {
        // generate random commands to send to clients
        var commands = [];
        for(var i = 0; i < 30; i++) {
          commands.push(Math.floor(Math.random() * 4));
        }
        game_reply.action = 'command';
        game_reply.commands = commands;
        group.messageGroup(group_id, JSON.stringify(reply), callback);
      }, callback);
    } else if(message.action === 'command') {
      game_reply.action = 'update';
      game_reply.source = username;
      game_reply.commands = message.commands;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}