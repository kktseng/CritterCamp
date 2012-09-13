var helpers = require('./helpers'),
    logger = require('./logger'),
    wsHandler = require('./wsHandler');

var messageUser = exports.messageUser = function(user_id, message) {
  // find the connection associated with user_id
  helpers.redis.hget('user_' + user_id, 'conn', function(err, conn_id) {
    if(err) { return logger.error(err); }

    if(!conn_id) {
      return logger.error(new Error('No connection found for this user'));
    }
    wsHandler.messageConn(conn_id, message);
  });
};

exports.messageAllUsers = function(users, message) {
  for(var i = 0; i < users.length; i++) {
    messageUser(users[i], message);
  }
};