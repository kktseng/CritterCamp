var helpers = require('./helpers'),
    logger = require('./logger'),
    group = require('./group'),
    action = require('./action');

// singleton list of all currently connected users
var connection_list = {};

// set up redis pub/sub to support load balancing connections
helpers.subscriber.subscribe('connection');

/**
* local functions only to be called by pubsub.js
* use deleteConn and messageConn otherwise
**/
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

/**
* delete a connection conn_id
**/
var deleteConn = exports.deleteConn = function(conn_id) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    delete(connection_list[conn_id]);
  }
  // formulate pub sub message
  var msg = { delete: conn_id };
  helpers.publisher.publish('connection', JSON.stringify(msg));
};

/**
* messages conn_id with message
**/
var messageConn = exports.messageConn = function(conn_id, message) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    return connection_list[conn_id].send(message);
  }
  // formulate pub sub message
  var msg = { message: { msg: message, conn_id: conn_id } };
  helpers.publisher.publish('connection', JSON.stringify(msg));
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
    helpers.createId(function(err, user_id) {
      if(err) { logger.error(err); }
      var names = ['Alex', 'Eric', 'Shyong', 'Leung', 'Flin'];
      user_id = names[Math.floor(Math.random() * 5)] + "" + user_id;
      connection.send(JSON.stringify({ user_id: user_id }));
      
      // check if user already has a connection
      helpers.redis.hget('user_' + user_id, 'conn', function(err, conn) {
        if(err) { logger.error(err); }
        if(conn) {
          return messageConn(conn, 'You can only log in to one device at a time yo.');
        }
        // assign user to current connection
        helpers.redis.hset('user_' + user_id, 'conn', conn_id, function(err) {
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
              if(message.action === 'join_group') {
                action.joinGroup(user_id, message, function(err, group_id) {
                  if(err) { return logger.error(err); }
                  connection.send('You were placed into group ' + group_id);
                });
              } else if(message.action === 'join_party') {
                action.joinParty(user_id, message, function(err, party_id) {
                  if(err) { return logger.error(err); }
                  connection.send('You were placed into party ' + party_id);
                });
              }
            }
          });

          connection.on('close', function(reasonCode, description) {
            // currently removing from group on connections close, but with async games, we don't want to do this
            group.removeFromGroup(user_id, function(err, group_id) {
              if(err) { logger.error(err); }
              if(group_id) { logger.info('Removed user ' + user_id + ' from group ' + group_id + ' for closing connection.'); }
              helpers.redis.hdel('user_' + user_id, 'conn');
              deleteConn(conn_id);
              logger.info('Peer ' + connection.remoteAddress + ' with id: ' + conn_id + ' disconnected.');
              logger.info('Current connections: ' + Object.keys(connection_list));
            });
          });

        });
      });
    });
  });
};
