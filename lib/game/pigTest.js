var group = require('../group');

/**
* pigTest is a simple game that allows users to add objects on the screen
* Each object added will show up to all users in the game
* The game ends when the number of objects exceeds 10
**/ 
module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    if(message.action === 'add_object') {
      if(message.xPos && message.yPos) {
        // message added object to rest of group
        var reply = {};
        reply.source = username;
        reply.action = 'add_object';
        reply.xPos = message.xPos;
        reply.yPos = message.yPos;
        group.messageGroup(group_id, JSON.stringify(reply), callback);
      }
    }
  });
}