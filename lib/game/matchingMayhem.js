var group = require('../group'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = { data: {} };
    reply.action = 'game';
    reply.name = 'matching_mayhem';
    if(message.action === 'score') {
      reply.data.action = 'score';
      reply.data.source = username;
      reply.data.score = message.score;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}