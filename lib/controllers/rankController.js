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
    var reply = { action: 'rank', type: 'submit' };

    // sanity check for exp_gained; if exceeds certain threshold they're probably cheating
    if(message.exp_gained > globals.EXCESSIVE_EXP_THRESHOLD) {
      return callback(null);
    }
    async.waterfall([
      function(callback) {
        helpers.m.User.getUser(username, callback);
      },
      function(user, callback) {
        users.setExp(username, user.exp + message.exp_gained, callback);
      },
      function(updated_user, callback) {
        reply.level = updated_user.level;
        reply.percentage_to_next_level = updated_user.getPercentNextLevel.bind(updated_user);
        helpers.m.User.setGold(updated_user.gold + gold_gained, callback);
      }
    ], function(err) {
      users.messageUser(username, JSON.stringify(reply), callback);
    });
  }
}