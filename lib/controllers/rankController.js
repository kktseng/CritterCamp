var async = require('async'),
    helpers = require('../helpers'),
    globals = require('../globals'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if (message.type == 'leader') {
    helpers.m.Leader.getLeaderInfo(function(err, results) {
      if(err) { return callback(err); }
      var reply = { action: 'rank', type: 'leader', leaders: results };
      users.messageUser(username, JSON.stringify(reply), callback);
    });
  } else if(message.type == 'submit') {
    if(message.exp_gained === undefined || message.gold_gained === undefined) {
      return callback(new Error('Missing parameters' + JSON.stringify(message)));
    }
    var reply = { action: 'rank', type: 'submit' };

    // sanity check for exp_gained; if exceeds certain threshold they're probably cheating
    if(message.exp_gained > globals.EXCESSIVE_EXP_THRESHOLD) {
      return callback(null);
    }

    users.updateResults(username, message.exp_gained, message.gold_gained, function(err, new_level, old_exp, new_exp, cur_exp) {
      if(err) { return callback(err); }
      // set user status in redis
      helpers.redis.multi()
        .hset('user_' + username, 'status', 'online')
        .expire('user_' + username, globals.REDIS_TIMEOUT)
      .exec(function(err) {
        reply.level = new_level;
        reply.old_exp = old_exp;
        reply.new_exp = new_exp;
        reply.cur_exp = cur_exp;
        users.messageUser(username, JSON.stringify(reply), callback);
      });
    });
  }
}