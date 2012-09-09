var helpers = require('./helpers.js');

// singleton list of all currently connected users
var connection_list = {};

exports.request = function(request) {

  // TODO: check if valid request
  // if not, return request.reject();
  
  var connection = request.accept(null, request.origin);
  
  // assign each connection a unique id
  var conn_id;
  do {
    conn_id = Math.floor(Math.random() * 10000000);
  }
  while(connection_list[conn_id]);
  connection_list[conn_id] = connection;
  
  console.log((new Date()) + ' Connection accepted with id: ' + conn_id);
  console.log('Current connections: ' + Object.keys(connection_list));

  connection.sendUTF(JSON.stringify({ conn_id: conn_id }));

  connection.on('message', function(message) {
    if(message.type !== 'utf8') {
      console.log('Bad message data type.');
    } else {
      var msg = JSON.parse(message);
      if(msg.action === 'queue') {
        redis.set("test", 1);
      }
    }
  });

  connection.on('close', function(resasonCode, description) {
    delete connection_list[conn_id];
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' with id: ' + conn_id + ' disconnected.');
    console.log('Current connections: ' + Object.keys(connection_list));
  });

};
