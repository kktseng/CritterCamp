var group = require('../group'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = { data: {} };
    reply.action = 'game';
    reply.name = 'color_clash';
    if(message.action === 'paint') {
      reply.data.action = 'paint';
      reply.data.source = username;
      reply.data.x_pos = message.x_pos;
      reply.data.y_pos = message.y_pos;
      reply.data.time = message.time;
      reply.data.scale = message.scale;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}