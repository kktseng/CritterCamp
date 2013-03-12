var group = require('../group'),
    helpers = require('../helpers');

module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = { data: {} };
    reply.action = 'game';
    reply.name = 'missile_madness';
    if(message.action === 'TODO') {
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}