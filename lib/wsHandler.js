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
exports.messageConn = function(conn_id, message) {
  // check cache before resorting to pub sub
  if(connection_list[conn_id]) {
    connection_list[conn_id].send(message);
  }
  // formulate pub sub message
  var msg = { message: { msg: message } };
  if(conn_id instanceof Array) {
    msg.message.conn_id = conn_id;
  } else {
    msg.conn_id = [conn_id];
  }
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
          action.joinGroup(conn_id, message, function(err, group_id) {
            if(err) { return logger.error(err); }
            connection.send('You were placed into group ' + group_id);
          });
        } else if(message.action === 'join_party') {
          action.joinParty(conn_id, message, function(err, party_id) {
            if(err) { return logger.error(err); }
            connection.send('You were placed into party ' + party_id);
          });
        }
      }
    });

    connection.on('close', function(reasonCode, description) {
      group.removeFromGroup(conn_id, function(err, group_id) {
        if(err) { logger.error(err); }
        if(group_id) { logger.info('Removed conn ' + conn_id + ' from group ' + group_id + ' for closing connection.'); }
        helpers.redis.del('conn_' + conn_id);
        deleteConn(conn_id);
        logger.info('Peer ' + connection.remoteAddress + ' with id: ' + conn_id + ' disconnected.');
        logger.info('Current connections: ' + Object.keys(connection_list));
      });
    });
    
  });
};
