var group = require('../group'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = { data: {} };
    reply.action = 'game';
    reply.name = 'fishing_frenzy';
    if(message.action === 'hook') {
      reply.data.action = 'hook';
      reply.data.source = username;
      reply.data.pos = message.pos;
      reply.data.time = message.time;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}