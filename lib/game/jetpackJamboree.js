var group = require('../group'),
    helpers = require('../helpers');

/**
* Jetpack Jamboree requires users to move pigs into pens sorted by color
* If the user takes too long, the jetpacks explode and the player loses
**/ 
module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = {};
    var game_reply = {};
    reply.action = 'game';
    reply.name = 'jetpack_jamboree';
    reply.data = game_reply;
    if(message.action === 'fly_pigs') {
      game_reply.action = 'add_pigs';
      game_reply.source = username;
      game_reply.color = message.color;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}