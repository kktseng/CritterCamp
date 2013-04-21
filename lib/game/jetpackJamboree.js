var group = require('../group'),
    helpers = require('../helpers');

/**
* Jetpack Jamboree requires users to move pigs into pens sorted by color
* If the user takes too long, the jetpacks explode and the player loses
**/ 
module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = { data: {} };
    reply.action = 'game';
    reply.name = 'jetpack_jamboree';
    if(message.action === 'fly') {
      reply.data.action = 'add';
      reply.data.source = username;
      reply.data.color = message.color;
    } else if(message.action === 'exploded') {
      reply.data.action = 'exploded';
      reply.data.source = username;
    } else if(message.action === 'update') {
      reply.data.action = 'update';
      reply.data.source = username;
      reply.data.count = message.count;
    } else return;
    group.messageGroup(group_id, JSON.stringify(reply), callback);
  });
}