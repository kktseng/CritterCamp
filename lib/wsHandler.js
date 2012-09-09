var helpers = require('./helpers'),
    logger = require('./logger'),
    group = require('./group'),
    action = require('./action');

// singleton list of all currently connected users
var connection_list = {};

exports.msgConn = function(conn_id, message) {
  if(!connection_list[conn_id]) {
    return logger.warn('Trying to message a connection that doesnt exist: ' + conn_id);
  }
  return connection_list[conn_id].sendUTF(message);
};

/**
* handles all websocket requests
**/
exports.request = function(request) {

  // TODO: check if valid request
  // if not, return request.reject();
  
  var connection = request.accept(null, request.origin);
  
  // assign each connection a unique id
  helpers.redis.multi()
    .incr('conn_count')
    .get('conn_count', function(err, conn_id) {
      if(err) { logger.error(err); }
      connection_list[conn_id] = connection;
  
      logger.info('Connection accepted with id: ' + conn_id);
      logger.info('Current connections: ' + Object.keys(connection_list));

      connection.sendUTF(JSON.stringify({ conn_id: conn_id }));

      connection.on('message', function(message) {
        if(message.type !== 'utf8') {
          logger.info('Bad message data type.');
        } else {
          try {
            message = JSON.parse(message.utf8Data);
          } catch(err) {
            logger.error(err);
            return connection.sendUTF('You must send a JSON packet.');
          }
          // route all different actions
          if(message.action === 'join_group') {
            action.joinGroup(conn_id, message, function(err, group_id) {
              if(err) { return logger.error(err); }
              connection.sendUTF('You were placed into group ' + group_id);
            });
          }
        }
      });

      connection.on('close', function(reasonCode, description) {
        group.removeFromGroup(conn_id, function(err, group_id) {
          if(err) { logger.error(err); }
          if(group_id) { logger.info('Removed conn ' + conn_id + ' from group ' + group_id + ' for closing connection.'); }
          helpers.redis.del('conn_' + conn_id);
          delete connection_list[conn_id];
          logger.info('Peer ' + connection.remoteAddress + ' with id: ' + conn_id + ' disconnected.');
          logger.info('Current connections: ' + Object.keys(connection_list));
        });
      });
    })
    .exec(function(err, reply) {
      if(err) { logger.error(err); }
    }
  );
};
