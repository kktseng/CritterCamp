var action = require('./action')
    async = require('async'),
    game = require('./game');
    group = require('./group'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    gameController = require('./controllers/gameController'),
    scoreController = require('./controllers/scoreController'),
    friendController = require('./controllers/friendController'),
    partyController = require('./controllers/partyController'),
    profileController = require('./controllers/profileController'),
    groupController = require('./controllers/groupController'),
    users = require('./users');

// singleton list of all currently connected and authenticated users
var connection_list = {};

// set up redis pub/sub to support load balancing connections
helpers.subscriber.subscribe('connection');

/*==========
* local functions only to be called by pubsub.js
* use deleteConn and messageConn otherwise
*/
exports.deleteLocalConn = function(conn_id) {
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

  // assign each connection a unique id
  helpers.createId(function(err, conn_id) {
    if(err) { logger.error(err); }
    connection_list[conn_id] = connection;
    var username;

    logger.info('Connection accepted with id: ' + conn_id);
    logger.info('Current connections: ' + Object.keys(connection_list));

    connection.write(JSON.stringify({ conn_id: conn_id }));

    var auth = false;
    connection.on('data', function(message) {
      try {
        message = JSON.parse(message);
      } catch(err) {
        logger.error(err);
        return connection.write('You must send a JSON packet.');
      }

      if(!auth) {
        if(message.auth) {
          helpers.redis.hget('auth', message.auth, function(err, name) {
            if(err) { return logger.err(err); }
            username = name;
            auth = true;
            helpers.redis.hdel('auth', message.auth);
            // check if user already has a connection
            helpers.redis.hget('user_' + username, 'conn', function(err, conn) {
              if(err) { logger.error(err); }
              if(conn) {
                return messageConn(conn, JSON.stringify({ action: 'error', msg: 'You can only log in to one device at a time.' }), logger.error);
              }
              // assign user to current connection
              helpers.redis.hset('user_' + username, 'conn', conn_id, logger.error);
              users.setStatus(username, 'online', logger.error);
            });
          });
        }
      } else {
        // route all different actions once authenticated
        if(message.action == 'game') {
          gameController(username, message, logger.error);
        } else if(message.action == 'score') {
          scoreController(username, message, logger.error);
        } else if(message.action == 'friend') {
          friendController(username, message, logger.error);
        } else if(message.action == 'party') {
          partyController(username, message, logger.error);
        } else if(message.action == 'profile') {
          profileController(username, message, logger.error);
        } else if(message.action == 'group') {
          groupController(username, message, logger.error);
        }
      }

    });

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
  });
};
