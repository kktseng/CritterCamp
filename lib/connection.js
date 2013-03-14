var async = require('async'),
    game = require('./game');
    group = require('./group'),
    party = require('./party'),
    helpers = require('./helpers'),
    globals = require('./globals'),
    logger = require('./logger'),
    controllers = require('./controllers'),
    users = require('./users');

// singleton list of all currently connected and authenticated users
var connection_list = {};

// set up redis pub/sub to support load balancing connections
helpers.subscriber.subscribe('connection');

/*==========
* local functions only to be called by pubsub.js
* use deleteConn and messageConn otherwise
*/
var deleteLocalConn = exports.deleteLocalConn = function(conn_id) {
  if(connection_list[conn_id]) {
    delete(connection_list[conn_id]);
    // this may have better performance - investigate further
    // connection_list[conn_id] = null;
  }
};

exports.messageLocalConn = function(conn_id, message) {
  if(connection_list[conn_id]) {
    connection_list[conn_id].write(message);
  }
};

exports.endLocalConn = function(conn_id) {
  if(connection_list[conn_id]) {
    connection_list[conn_id].end();
    deleteLocalConn(conn_id);
  }
}
//==========

/**
* delete a connection conn_id
**/
var deleteConn = exports.deleteConn = function(conn_id, callback) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    delete(connection_list[conn_id]);
    // this may have better performance - investigate further
    // connection_list[conn_id] = null;
    return callback(null);
  }
  // formulate pub sub message
  var msg = { remove: conn_id };
  helpers.publisher.publish('connection', JSON.stringify(msg), callback);
};

var setConn = function(username, conn_id) {
  helpers.redis.multi()
    .hset('user_' + username, 'conn', conn_id)
    .expire('user_' + username, globals.REDIS_TIMEOUT)
  .exec(logger.error);
  users.setStatus(username, 'online', logger.error);
};

/**
* end a connection based on username
**/
var endConn = exports.endConn = function(username, callback) {
  helpers.redis.hget('user_' + username, 'conn', function(err, conn_id) {
    if(err) { return logger.error(err); }
    var msg = { end: conn_id };
    helpers.publisher.publish('end', JSON.stringify(msg), callback);
  });
};

/**
* messages conn_id with message
**/
var messageConn = exports.messageConn = function(conn_id, message, callback) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    return connection_list[conn_id].write(message);
  }
  // formulate pub sub message
  var msg = { message: { msg: message, conn_id: conn_id } };
  helpers.publisher.publish('connection', JSON.stringify(msg), callback);
};

/**
* handles all tcp requests
**/
exports.request = function(connection) {
  // set timeout of 1 minute
  // connection.setTimeout(2*60*1000);
  connection.setKeepAlive(true);

  // convert all incoming data to utf8
  connection.setEncoding();

  // assign each connection a unique id
  helpers.createId(function(err, conn_id) {
    if(err) { return logger.error(err); }
    connection_list[conn_id] = connection;
    var username;

    logger.info('Connection accepted with id: ' + conn_id);
    logger.info('Current connections: ' + Object.keys(connection_list));

    connection.write(JSON.stringify({ conn_id: conn_id }));

    connection.on('timeout', function() {
      connection.end();
    });

    connection.on('close', function(data) {
      // currently removing from group on connections close, but with async games, we don't want to do this
      async.series([
        async.apply(group.removeFromGroup, username),
        async.apply(helpers.redis.del.bind(helpers.redis), 'user_' + username),
        async.apply(deleteConn, conn_id)
      ], function(err, results) {
        if(err) { logger.error(err); }
        if(results[0]) {
          group.messageGroupStatus(results[0], logger.error);
        }
        logger.info(username + ' disconnected.');
        logger.info('Current connections: ' + Object.keys(connection_list));
      });
    });

    var auth = false;
    connection.on('data', function(message) {
      // check socket closure
      if(message === 'close') {
        connection.end();
        return;
      }

      // check if messages have been aggregated
      if(message.indexOf('}{') > -1) {
        var messages = message.slice(1, -1).split('}{');
        for(var i = 0; i < messages.length; i++) {
          messages[i] = '{' + messages[i] + '}';
        }
      } else {
        messages = [ message ];
      }

      messages.forEach(function(message) {
        try {
          message = JSON.parse(message);
        } catch(err) {
          logger.warn(err);
          return connection.write('You must send a JSON packet: \"' + message + '\"');
        }

        if(!auth) {
          if(message.auth) {
            helpers.redis.hget('auth', message.auth, function(err, name) {
              if(err) { return logger.error(err); }
              username = name;
              auth = true;
              helpers.redis.hdel('auth', message.auth, logger.err);
              // check if user already has a connection
              helpers.redis.hget('user_' + username, 'conn', function(err, conn) {
                if(err) { return logger.error(err); }
                if(conn) {
                  // wipe any existing user data
                  async.waterfall([
                    async.apply(party.removeFromParty, username),
                    function(party_id, callback) {
                      group.removeFromGroup(username, callback);
                    },
                    function(group_id, callback) {
                      if(!group_id) { return callback(); }
                      helpers.redis.llen('group_' + group_id, function(err, len) {
                        callback(err, group_id, len);
                      });
                    }
                  ], function(err, group_id, group_len) {
                    if(err) { return logger.error(err); }
                    if(group_len == 0) {
                      helpers.redis.hget('user_' + username, 'version', function(err, version) {
                        if(err) { return logger.error(err); }
                        helpers.redis.lrem('queue_' + version, 0, group_id, function(err, num_rem) {
                          if(err) { return logger.error(err); }
                        });
                      });
                    }
                  });
                }
                // assign user to current connection
                setConn(username, conn_id);
              });
            });
          }
        } else {
          // route all different actions once authenticated
          if(message.action == 'game') {
            controllers.game(username, message, logger.error);
          } else if(message.action == 'rank') {
            controllers.rank(username, message, logger.error);
          } else if(message.action == 'friend') {
            controllers.friend(username, message, logger.error);
          } else if(message.action == 'party') {
            controllers.party(username, message, logger.error);
          } else if(message.action == 'profile') {
            controllers.profile(username, message, logger.error);
          } else if(message.action == 'group') {
            controllers.group(username, message, logger.error);
          }
        }
      });
    });
  });
};
