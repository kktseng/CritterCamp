var helpers = require('./helpers'),
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
      if(err) { console.log("wooo another error for the logger"); }
      connection_list[conn_id] = connection;
  
      console.log((new Date()) + ' Connection accepted with id: ' + conn_id);
      console.log('Current connections: ' + Object.keys(connection_list));

      connection.sendUTF(JSON.stringify({ conn_id: conn_id }));

      connection.on('message', function(message) {
        if(message.type !== 'utf8') {
          console.log('Bad message data type.');
        } else {
          try {
            message = JSON.parse(message.utf8Data);
          } catch(err) {
            return connection.sendUTF('You must send a JSON packet.');
          }
          if(message.action === 'queue') {
            if(!message.game) {
              return connection.sendUTF('You need to specify a game stupid.');
            }
            group.findGroup([conn_id], message.game, 1, function(err, group_id) {
              if(err) { return console.log('sigh there was an error and i dont have a logger yet: ' + err.toString()); }
              return connection.sendUTF('You were placed into group ' + group_id);
            });
          }
        }
      });

      connection.on('close', function(reasonCode, description) {
        delete connection_list[conn_id];
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' with id: ' + conn_id + ' disconnected.');
        console.log('Current connections: ' + Object.keys(connection_list));
      });
    })
    .exec(function(err, reply) {
      if(err) { return console.log('error and i dont have a logger gg'); }
    }
  );
};
