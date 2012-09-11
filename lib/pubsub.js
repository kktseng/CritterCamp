var helpers = require('./helpers'),
    logger = require('./logger'),
    wsHandler = require('./wsHandler');

helpers.subscriber.on('message', function(channel, message) {
  logger.info('Channel ' + channel + ' received: ' + message);

  if(channel === 'connection') {
    message = JSON.parse(message);

    if(message.delete) {
      wsHandler.deleteLocalConn(message.delete);

    } else if(message.message) {
      for(var i = 0; i < message.message.conn_id.length; i++) {
        wsHandler.messageLocalConn(message.message.conn_id[i], message.message.msg);
      }
    }
  }
});