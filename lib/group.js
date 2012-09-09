var async = require('async'),
    wsHandler = require('./wsHandler'),
    helpers = require('./helpers'),
    redis = helpers.redis;

var GROUP_SIZE = 3; // PUT THIS IN A CONFIG FOR ALL GAMES LATER

/**
* creates a new group from group_count in redis
**/
function createGroupId(callback) {
  redis.multi()
    .incr('group_count')
    .get('group_count', function(err, group_id) {
      if(err) { return callback(err); }
      return callback(null, group_id);
    })
    .exec(function(err, reply) {
      if(err) { return callback(err); }
    }
  );
}

/**
* matches a user or party to a group based on game
* callback(err, group_id of which conn_id was added to)
**/
exports.findGroup = function(conn_id, game, callback) {
  var party_size = conn_id.length;
  var full = (party_size === GROUP_SIZE); // prevents an extra redis call

  if(party_size > GROUP_SIZE) {
    return callback(new Error('Party size is larger than max group size.'));
  } else if(full) {
    // create a group and return the id
    createGroupId(function(err, group_id) {
      if(err) { return callback(err); }
      for(var i = 0; i < conn_id.length; i++) {
        redis.rpush('group_' + group_id, conn_id[i]);
        wsHandler.getConn(conn_id[i]).sendUTF('Congrats bro, youre in group ' + group_id);
      }
      return callback(null, group_id);
    });
  } else {
    var checkAvailability = function(group_id, cb) {
      redis.watch('group_' + group_id); // ensure there are no race conditions
      redis.llen('group_' + group_id, function(err, length) {
        if(err) { cb(err); }

        if(length + party_size <= GROUP_SIZE) {
          var multi = redis.multi();

          for(var i = 0; i < conn_id.length; i++) {
            // add all members to group
            multi.rpush('group_' + group_id, conn_id[i]);
          }

          if(length + party_size === GROUP_SIZE) {
            // remove the group from queue if full
            multi.srem('queue_' + game, group_id);
            full = true;
          }

          multi.exec(function(err, reply) {
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
    async.waterfall([
      function(cb) {
        redis.smembers('queue_' + game, cb);
      },
      function(arr, cb) {
        async.forEachSeries(arr, checkAvailability, cb);
      },
      // could not add to any group, so create a new one
      async.apply(createGroupId),
      function(group_id, cb) {
        for(var i = 0; i < conn_id.length; i++) {
          // add all members to group
          redis.rpush('group_' + group_id, conn_id[i]);
        }
        redis.sadd('queue_' + game, group_id);
        cb(null, group_id);
      }
    ], function(err, result) {
      if(err && err.success) {
        // broadcast to group if it has been filled
        if(full) {
          redis.lrange('group_' + err.success, 0, -1, function(error, arr) {
            if(error) { callback(error); }
            for(var i = 0; i < arr.length; i++) {
              wsHandler.getConn(arr[i]).sendUTF('Congrats bro, youre in group ' + err.success);
            }
            return callback(null, err.success);
          });
        } else {
          return callback(null, err.success);
        }
      } else {
        return callback(err, result);
      }
    });
  }
};

/**
* removes a connection from its group
* cb(err, group from which conn_id was deleted from)
**/
exports.removeFromGroup = function(conn_id, callback) {
  async.waterfall([
    function(cb) {
      redis.hget('conn_' + conn_id, 'group', cb);
    },
    function(group_id, cb) {
      redis.lrem('group_' + group_id, 0, conn_id);
      cb(null, group_id);
    }
  ], function(err, group_id) {
    if(err) { callback(err); }
    redis.hdel('conn_' + conn_id, 'group');
    return callback(null, group_id);
  });
};