var group = require('../group'),
    helpers = require('../helpers');

function sync(group_id, command, callback) {
  // find number of users in current group
  helpers.redis.multi()
    .llen('group_' + group_id)
    .incr('group_' + group_id + '_sync')
    .expire('group_' + group_id + '_sync', 30) // 30 seconds before deleting
  .exec(function(err, reply) {
    if(err) { return callback(err); }
    // all players synced
    if(reply[0] === reply[1]) {
      command();
      helpers.redis.del('group_' + group_id + '_sync', callback);
    }
  });
}

/**
* Starry Night is a simon says type game where users must enter dance moves
* The winner of each game is the one who inputs the least amount of incorrect moves
**/ 
module.exports = function(username, message, callback) {
  group.getGroup(username, function(err, group_id) {
    if(err) { return callback(err); }

    var reply = {};
    var game_reply = {};
    reply.action = 'game';
    reply.name = 'starry_night';
    reply.data = game_reply;
    if(message.action === 'sync_command') {
      sync(group_id, function() {
        // generate random commands to send to clients
        var commands = [];
        for(var i = 0; i < 30; i++) {
          commands.push(Math.floor(Math.random() * 4));
        }
        game_reply.action = 'command';
        game_reply.commands = commands;
        group.messageGroup(group_id, JSON.stringify(reply), callback);
      }, callback);
    } else if(message.action === 'score_submit') {
      if(!message.score) { return callback(new Error('Missing score parameter.')); }
      helpers.redis.multi()
        .rpush('group_' + group_id + '_sync_cache', JSON.stringify(message.score))
        .expire('group_' + group_id + '_sync_cache', 30)
      .exec(function(err) {
        if(err) { return callback(err); }
        sync(group_id, function() {
          helpers.redis.lrange('group_' + group_id + '_sync_cache', 0, -1, function(err, scores) {
            score_map = {};
            scores.forEach(function(score) {
              score = JSON.parse(score);
              for(var username in score) {
                if(!score_map[username]) {
                  score_map[username] = [];
                }
                score_map[username].push(score[username]);
              }
              game_reply.action = 'score';
              game_reply.scores = [];
              for(var user in score_map) {
                var sorted = score_map[user].sort();
                var score_packet = { username: user }
                if(sorted.length < 3) {
                  score_packet.score = sorted[sorted.length - 1];
                } else if(sorted[1] === sorted[2]) {
                  score_packet.score = sorted[2];
                } else if(sorted[0] === sorted[1]) {
                  score_packet.score = sorted[1];
                } else score_packet.score = sorted[sorted.length - 1];
                game_reply.scores.push(score_packet);
              }
              group.messageGroup(group_id, JSON.stringify(reply), callback);
            });
          });
        }, callback);
      });
    } else if(message.action === 'command') {
      game_reply.action = 'update';
      game_reply.source = username;
      game_reply.commands = message.commands;
      group.messageGroup(group_id, JSON.stringify(reply), callback);
    }
  });
}