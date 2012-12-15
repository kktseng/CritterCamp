var async = require('async'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    connection = require('./connection'),
    friend = require('friend');

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
  helpers.redis.hget('user_' + username, 'status', function(err, status) {
    if(err) { return callback(err); }
    if(!status) {
      status = 'offline';
    }
    callback(null, status);
}

exports.setStatus = function(username, status, callback) {
  getStatus(username, function(err, current_status) {
    if(err) { return callback(err); }
    if (current_status === status) { 
      return callback(); 
    } else {
      friend.getFriendList(username, function(err, friend_list) {
        var result = { user: { username: username, status: status } };
        messageAllUsers(friend_list[1], result, function(err) {
          if(err) { return callback(err); }
          helpers.redis.hset('user_' + username, 'status', status, callback);
        })
      });
    } 
  });
}