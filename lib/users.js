var async = require('async'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    connection = require('./connection');

var messageUser = exports.messageUser = function(username, message, callback) {
  // find the connection associated with username
  helpers.redis.hget('user_' + username, 'conn', function(err, conn_id) {
    if(err) { return logger.error(err); }

    if(!conn_id) {
      return logger.error('No connection found for this user');
    }
    connection.messageConn(conn_id, message, callback);
  });
};

exports.messageAllUsers = function(users, message, callback) {
  async.forEach(users, function(user, cb) {
    messageUser(user, message, cb);
  }, callback);
};

exports.getStatus = function(username, callback) {
  helpers.redis.hget('user_' + username, 'status', callback);
}