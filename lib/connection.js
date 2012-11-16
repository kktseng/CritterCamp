var action = require('./action')
    async = require('async'),
    game = require('./game');
    group = require('./group'),
    helpers = require('./helpers'),
    logger = require('./logger');

// singleton list of all currently connected users
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
  connection.setTimeout(1*60*1000);

  // assign each connection a unique id
  helpers.createId(function(err, conn_id) {
    if(err) { logger.error(err); }
    connection_list[conn_id] = connection;

    logger.info('Connection accepted with id: ' + conn_id);
    logger.info('Current connections: ' + Object.keys(connection_list));

    connection.write(JSON.stringify({ conn_id: conn_id }));

    // create a dummy user for current testing purposes
    // in the future, the user would need to be looked up based on device id
    // or alternatively, use a username/password system
    helpers.createId(function(err, username) {
      if(err) { logger.error(err); }
      var names = ['Alex', 'Eric', 'Shyong', 'Leung', 'Flin'];
      username = names[Math.floor(Math.random() * 5)] + '' + username;
      connection.write(JSON.stringify({ username: username }));
      
      // check if user already has a connection
      helpers.redis.hget('user_' + username, 'conn', function(err, conn) {
        if(err) { logger.error(err); }
        if(conn) {
          return messageConn(conn, 'You can only log in to one device at a time yo.', logger.error);
        }
        // assign user to current connection
        helpers.redis.hset('user_' + username, 'conn', conn_id, function(err) {
          if(err) { logger.error(err); }

          connection.on('data', function(message) {
            try {
              message = JSON.parse(message);
            } catch(err) {
              logger.error(err);
              return connection.write('You must send a JSON packet.');
            }

            // route all different actions
            if(message.action === 'login') {
              action.login(conn_id, message, function(err, user) {
                if(err) { return logger.error(err); }
                username = user.username;
                connection.write('Login successful');
              });
            } else if(message.action === 'create_user_account') {
              action.createUserAccount(conn_id, message, function(err, user) {
                if(err) { return logger.error(err); }
                username = user.username;
                connection.write('Login successful');
              });
            } else if(message.action === 'create_user') {
              action.createUser(conn_id, message, function(err, user) {
                if(err) { return logger.error(err); }
                username = user.username;
                connection.write('Login successful');
              });
            } else if(message.action === 'get_news') {
              action.getNews(conn_id, message.num_posts, logger.error);
            }

            // else if(username) {
            //
            // TODO: move this so only allowed when login
            // This is outside for testing purposes ONLY
              if(message.action === 'game' && message.data) {
                if(message.game === 'pig_test') {
                  game.pigTest(username, message.data, logger.error);
                }
              } else if(message.action === 'join_group') {
                action.joinGroup(username, message, logger.error);
              } else if(message.action === 'invite_party') {
                action.inviteParty(username, message, logger.error);
              } else if(message.action === 'accept_party') {
                action.acceptParty(username, message, logger.error);
              } else if(message.action === 'reject_party') {
                action.rejectParty(username, message);
              } else if(message.action === 'remove_party') {
                action.removeParty(username, message, logger.error);
              } else if(message.action === 'leave_party') {
                action.leaveParty(username, message, logger.error);
              }
            // }
          });

          connection.on('timeout', function() {
            socket.end();
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
      });
    });
  });
};
