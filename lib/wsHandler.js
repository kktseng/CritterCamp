var async = require('async'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    group = require('./group'),
    action = require('./action');

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
  }
};

exports.messageLocalConn = function(conn_id, message) {
  if(connection_list[conn_id]) {
    connection_list[conn_id].send(message);
  }
};
//==========

/**
* delete a connection conn_id
**/
var deleteConn = exports.deleteConn = function(conn_id, callback) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    return delete(connection_list[conn_id]);
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
    return connection_list[conn_id].send(message);
  }
  // formulate pub sub message
  var msg = { message: { msg: message, conn_id: conn_id } };
  helpers.publisher.publish('connection', JSON.stringify(msg), callback);
};

/**
* handles all websocket requests
**/
exports.request = function(request) {

  // TODO: check if valid request
  // if not, return request.reject();
  
  var connection = request.accept(null, request.origin);
  
  // assign each connection a unique id
  helpers.createId(function(err, conn_id) {
    if(err) { logger.error(err); }
    connection_list[conn_id] = connection;

    logger.info('Connection accepted with id: ' + conn_id);
    logger.info('Current connections: ' + Object.keys(connection_list));

    connection.send(JSON.stringify({ conn_id: conn_id }));

    // create a dummy user for current testing purposes
    // in the future, the user would need to be looked up based on device id
    // or alternatively, use a username/password system
    helpers.createId(function(err, username) {
      if(err) { logger.error(err); }
      var names = ['Alex', 'Eric', 'Shyong', 'Leung', 'Flin'];
      username = names[Math.floor(Math.random() * 5)] + '' + username;
      connection.send(JSON.stringify({ username: username }));
      
      // check if user already has a connection
      helpers.redis.hget('user_' + username, 'conn', function(err, conn) {
        if(err) { logger.error(err); }
        if(conn) {
          return messageConn(conn, 'You can only log in to one device at a time yo.', logger.error);
        }
        // assign user to current connection
        helpers.redis.hset('user_' + username, 'conn', conn_id, function(err) {
          if(err) { logger.error(err); }

          connection.on('message', function(message) {
            if(message.type !== 'utf8') {
              logger.info('Bad message data type.');
            } else {
              try {
                message = JSON.parse(message.utf8Data);
              } catch(err) {
                logger.error(err);
                return connection.send('You must send a JSON packet.');
              }
              // route all different actions
              if(message.action === 'login') {
                action.login(conn_id, message, function(err, user) {
                  if(err) { return logger.error(err); }
                  username = user.username;
                  connection.send('Login successful');
                });
              }

              // actions allowed only when logged in
              if(username) {
                if(message.action === 'join_group') {
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
              }
            }
          });

          connection.on('close', function(reasonCode, description) {
            // currently removing from group on connections close, but with async games, we don't want to do this
            async.series([
              async.apply(group.removeFromGroup, username),
              group.messageGroupStatus,
              async.apply(helpers.redis.del.bind(helpers.redis), 'user_' + username),
              async.apply(deleteConn, conn_id)
            ], function(err) {
              if(err) { logger.error(err); }
              logger.info('Peer ' + connection.remoteAddress + ' with id: ' + conn_id + ' disconnected.');
              logger.info('Current connections: ' + Object.keys(connection_list));
            });
          });

        });
      });
    });
  });
};
