var async = require('async'),
    helpers = require('../helpers'),
    globals = require('../globals'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if (message.type == 'leader') {
    var leader_ids = [];
    helpers.m.Leader.getLeaders(function(err, leaders) {
      leaders.forEach(function(leader) {
        leader_ids.push(leader._id);
      });
      // get usernames of leaders from user ids
      async.map(leader_ids, helpers.m.User.getUsername, function(err, results) {
        if(err) { return callback(err); }
        var reply = { 'action': 'rank', 'type': 'leader', 'leaders': results };
        users.messageUser(username, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'submit') {
    var result = { 'action': 'rank', 'type': 'submit' };

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
        result.level = updated_user.level;
        result.percentage_to_next_level = updated_user.get_percentage_to_next_level();
        helpers.m.User.setGold(updated_user.gold + gold_gained, callback);
      }
    ], function(err) {
      users.messageUser(username, JSON.stringify(reply), callback);
    });
  }
}