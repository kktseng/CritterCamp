var async = require('async'),
    config = require('config'),
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
    connection_list[conn_id].end()
    delete(connection_list[conn_id]);
    // this may have better performance - investigate further
    // connection_list[conn_id] = null;
  }
};

exports.messageLocalConn = function(conn_id, message) {
  if(connection_list[conn_id]) {
    try {
      var result = connection_list[conn_id].write(message);
    } catch(err) {
      logger.warn(err);
      deleteConn(conn_id, callback);
    }
  }
};

exports.endLocalConn = function(conn_id) {
  if(connection_list[conn_id]) {
    connection_list[conn_id].end();
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
    if(connection_list[conn_id]) {
      connection_list[conn_id].end();
      return callback(null);
    }
    // formulate pub sub message
    var msg = { end: conn_id };
    helpers.publisher.publish('end', JSON.stringify(msg), callback);
  });
};

/*
* messages conn_id with message
**/
var messageConn = exports.messageConn = function(conn_id, message, callback) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    try {
      var result = connection_list[conn_id].write(message);
    } catch(err) {
      logger.warn(err);
      deleteConn(conn_id, callback);
    }
    return callback(null);
  }
  // formulate pub sub message
  var msg = { message: { msg: message, conn_id: conn_id } };
  helpers.publisher.publish('connection', JSON.stringify(msg), callback);
};

/**
* handles all tcp requests
**/
exports.request = function(connection) {
  // set timeout of 10 seconds
  connection.setTimeout(10*1000);
  // connection.setKeepAlive(true);

  // convert all incoming data to utf8
  connection.setEncoding();

  // assign each connection a unique id
  helpers.createId(function(err, conn_id) {
    if(err) { return logger.error(err); }
    connection_list[conn_id] = connection;
    var username;

    logger.debug('Connection accepted with id: ' + conn_id);
    logger.debug('Current connections: ' + Object.keys(connection_list));

    connection.on('timeout', function() {
      connection.destroy();
    });

    connection.on('error', function(exc) {
      logger.warn(exc);
    });

    connection.on('close', function(data) {
      // currently removing from group on connections close, but with async games, we don't want to do this
      async.series([
        async.apply(group.removeFromGroup, username),
        async.apply(helpers.redis.del.bind(helpers.redis), 'user_' + username),
        async.apply(deleteConn, conn_id),
        async.apply(helpers.redis.decr.bind(helpers.redis), 'connection_count')
      ], function(err, results) {
        if(err) { logger.error(err); }
        if(results[0]) {
          group.messageGroupStatus(results[0], logger.error);
        }
        logger.debug(username + ' disconnected.');
        logger.debug('Current connections: ' + Object.keys(connection_list));
      });
    });

    var auth = false;
    connection.on('data', function(message) {
      // check socket closure
      if(message === 'close') {
        connection.destroy();
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
          if(message === '{}') {
            return connection.write('{}');
          } else {
            logger.debug((username || conn_id) + ': ' + message);
            message = JSON.parse(message);
          }
        } catch(err) {
          logger.warn(err);
          messageConn(conn_id, 'You must send a JSON packet: \"' + message + '\"', function(err) {
            if(err) { return logger.error(err); }
            return;
          });
        }

        if(!auth) {
          if(message.auth) {
            helpers.redis.hget('auth', message.auth, function(err, name) {
              if(err) { return logger.error(err); }
              username = name;
              auth = true;
              helpers.redis.hdel('auth', message.auth, logger.err);
              setConn(username, conn_id);
            });
          }
        } else {
          // route all different actions once authenticated
          controllers[message.action] && controllers[message.action](username, message, logger.error);
        }
      });
    });

    var conn_reply = { conn_id: conn_id };
    messageConn(conn_id, JSON.stringify(conn_reply), function(err) {
      if(err) { return logger.error(err); }
      helpers.redis.incr('connection_count', function(err) {
        if(err) { return logger.error(err); }
      });
    });
  });
};
