var redis = require('redis'),
    config = require('../config/configuration'),
    logger = require('./logger'),
    mongoose = require('mongoose');

var helpers = module.exports = {
  
  // redis clients
  redis: redis.createClient(config.file.Redis.port, config.file.Redis.host),
  publisher: redis.createClient(config.file.Redis.port, config.file.Redis.host),
  subscriber: redis.createClient(config.file.Redis.port, config.file.Redis.host),

  m: {},
  
  /**
  * creates an unique ID
  * 
  * callback(err, id
  **/
  createId: function(callback) {
    helpers.redis.multi()
      .incr('id_count')
      .get('id_count', callback)
      .exec(function(err) {
        if(err) { return callback(err); }
      }
    );
  },

  /**
  * initializes all mongoose models
  **/
  initModels: function() {
    var uri = config.mongoUri();

    // set keepAlive because azure's load balancer will kill idle connections
    var options = {
      server: {
        socketOptions: { keepAlive: 1 }
      }
    };
    logger.info('mongo dburi: ' + uri);
    mongoose.connect(uri, options, function(err) {
      if(err) { return logger.error(err) };
    });
    this.m = require('../models');
  },

  /**
  * generates secure random strings
  **/
  rand: function() {
    try {
      var buf = require('crypto').randomBytes(16);
      return buf.toString('hex');
    } catch(ex) {
      logger.error(ex);
    }
  },

  /**
  * checks if a given user exists in mongo
  *
  * callback(err, bool)
  **/
  validUser: function(user, callback) {
    helpers.m.User.findOne({ username: user }, function(err, result) {
      if(err) { return callback(err); }
      return callback(err, (results === null));
    });
  },

  /**
  * checks if a given user is valid and also currently connected to the server
  *
  * callback(err, bool)
  **/
  onlineUser: function(user, callback) {
    validUser(user, function(err, isValid) {
      if(err) { return callback(err); }
      if(!isValid) {
        return false;
      }
      helpers.redis.exists('user_' + user, callback);
    });
  }

};

if (config.file.Redis.db) {
  helpers.redis.select(config.file.Redis.db);
}