var async = require('async'),
    helpers = require('../helpers'),
    leader = require('../leader'),
    globals = require('../globals'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if (message.type == 'leader') {
    leader.getLeaderUsernames(function(err, results) {
      if(err) { return callback(err); }
      var reply = { action: 'rank', type: 'leader', leaders: results };
      users.messageUser(username, JSON.stringify(reply), callback);
    });
  } else if(message.type == 'submit') {
    if(!message.exp_gained || !message.gold_gained) {
      return callback(new Error('Missing parameters' + message));
    }
    var reply = { action: 'rank', type: 'submit' };

    // sanity check for exp_gained; if exceeds certain threshold they're probably cheating
    if(message.exp_gained > globals.EXCESSIVE_EXP_THRESHOLD) {
      return callback(null);
    }

    users.updateResults(username, message.exp_gained, message.gold_gained, function(err, new_level, percentage) {
      if(err) { return callback(err); }
      reply.level = new_level;
      reply.percentage = percentage;
      users.messageUser(username, JSON.stringify(reply), callback);
    });
  }
}