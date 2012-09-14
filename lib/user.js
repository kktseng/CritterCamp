var async = require('async'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    wsHandler = require('./wsHandler');

var messageUser = exports.messageUser = function(user_id, message, callback) {
  // find the connection associated with user_id
  helpers.redis.hget('user_' + user_id, 'conn', function(err, conn_id) {
    if(err) { return logger.error(err); }

    if(!conn_id) {
      return logger.error('No connection found for this user');
    }
    wsHandler.messageConn(conn_id, message, callback);
  });
};

exports.messageAllUsers = function(users, message, callback) {
  async.forEach(users, function(user, cb) {
    messageUser(user, message, cb);
  }, callback);
};