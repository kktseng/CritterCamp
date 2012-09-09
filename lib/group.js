var async = require('async'),
    wsHandler = require('./wsHandler'),
    helpers = require('./helpers'),
    redis = helpers.redis;

var GROUP_SIZE = 3; // PUT THIS IN A CONFIG FOR ALL GAMES LATER

/**
* matches a user or party to a group based on game
* callback(err, group_id)
**/
exports.findGroup = function(conn_id, game, party_size, callback) {
  var full = (party_size === GROUP_SIZE); // prevents an extra redis call

  if(party_size > GROUP_SIZE) {
    return cb(new Error('Party size is larger than max group size.'));
  } else if(full) {
    // create a group and return the id
    var group_id = Math.floor(Math.random() * 10000000);
    for(var i = 0; i < conn_id.size; i++) {
      redis.rpush('group_' + group_id, conn_id[i]);
      wsHandler.getConn(conn_id[i]).sendUTF('Congrats bro, youre in group ' + group_id);
    }
    return cb(null, group_id);
  }
  redis.smembers('queue_' + game, function(err, arr) {
    if(err) { return callback(err); }

    function checkAvailability(group_id, cb) {
      redis.watch('group_' + group_id); // ensure there are no race conditions
      redis.llen('group_' + group_id, function(err, length) {
        if(err) { cb(err); }

        if(length + party_size <= GROUP_SIZE) {

          for(var i = 0; i < conn_id.size; i++) {
            // add all members to group
            redis.multi().rpush('group_' + group_id, conn_id[i]);
            full = true;
          }

          if(length + party_size === GROUP_SIZE) {
            // remove the group from queue if full
            redis.multi().srem('queue_' + game, group_id);
          }

          redis.exec(function(err, reply) {
            if(err) { return cb(err); }
            if(reply) { // the group was successfully added onto
              return cb({ success: group_id });
            } else {
              return cb(); // continue on to next group
            }
          });
        }
      });
    }
    async.forEachSeries(arr, checkAvailability, function(err) {
      if(err && err.success) {
        // broadcast to group if it has been filled
        if(full) {
          redis.lrange('group_' + err.success, 0, -1, function(err, arr) {
            if(err) { callback(err); }
            for(var i = 0; i < arr.size; i++) {
              wsHandler.getConn(arr[i]).sendUTF('Congrats bro, youre in group ' + group_id);
            }
            cb(null, err.success);
          });
        } else {
          cb(null, err.success);
        }
      } else if(err) {
        return callback(err);
      } else {
        // could not add to any group, so create a new one
        var group_id = Math.floor(Math.random() * 10000000);
        for(var i = 0; i < conn_id.size; i++) {
          // add all members to group
          redis.multi().rpush('group_' + group_id, conn_id[i]);
        }
        redis.multi().sadd('queue_' + game, group_id).exec(function(err, reply) {
          if(err) { return callback(err); }
          return cb(null, group_id);
        });
      }
    })
  });
};