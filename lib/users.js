var async = require('async'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    wsHandler = require('./wsHandler');

var messageUser = exports.messageUser = function(username, message, callback) {
  // find the connection associated with username
  helpers.redis.hget('user_' + username, 'conn', function(err, conn_id) {
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

/**
* validates new user information and stores the new user in mongo
*
* callback(err, user)
**/
exports.createUser = function(username, email, password, callback) {
  async.parallel([
    async.apply(helpers.m.User.findOne, { username: username }),
    async.apply(helpers.m.User.findOne, { email: email })
  ], function(err, results) {
    if(err) { return callback(err); }
    if(results[0]) {
      return callback(new Error('Username ' + username + ' already exists'));
    } else if(results[1]) {
      return callback(new Error('Email ' + email + ' already in use'));
    } else {
      var encrypted = helpers.m.User.hashPassword(password);
      var user = new helpers.m.User({ username: username, email: email, password: encrypted });
      user.save(callback);
    }
  });
};