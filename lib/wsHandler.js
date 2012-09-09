var helpers = require('./helpers'),
    logger = require('./logger'),
    group = require('./group');

// singleton list of all currently connected users
var connection_list = {};
exports.getConn = function(conn_id) {
  return connection_list[conn_id];
};

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
          if(message.action === 'queue') {
            if(!message.game) {
              return connection.sendUTF('You need to specify a game stupid.');
            }
            group.findGroup([conn_id], message.game, 1, function(err, group_id) {
              if(err) { logger.error(err); }
              helpers.redis.hset('conn_' + conn_id, 'group', group_id);
              return connection.sendUTF('You were placed into group ' + group_id);
            });
          }
        }
      });

      connection.on('close', function(reasonCode, description) {
        helpers.redis.del('conn_' + conn_id);
        group.removeFromGroup(conn_id, function(err, group_id) {
          if(err) { logger.error(err); }
          logger.info('Removed ' + conn_id + ' from group ' + group_id + ' for closing connection.');
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
