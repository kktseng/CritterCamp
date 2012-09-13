var helpers = require('./helpers'),
    logger = require('./logger'),
    wsHandler = require('./wsHandler');

helpers.subscriber.on('message', function(channel, message) {
  logger.info('Channel ' + channel + ' received: ' + message);

  // handles connections between different servers for load balancing
  if(channel === 'connection') {
    message = JSON.parse(message);

    if(message.delete) {
      wsHandler.deleteLocalConn(message.delete);

    } else if(message.message) {
      wsHandler.messageLocalConn(message.message.conn_id, message.message.msg);
    }
  }
});