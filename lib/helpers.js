var async = require('async'),
    redis = require('redis'),
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
  * callback(err, id)
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
  * deals with mutexes in redis
  *
  * callback(err, success)
  **/
  aquireLock: function(lock_name, max_lock_time, callback) {
    helpers.redis.set(lock_name + '_lock', 'locked', 'NX', 'EX', max_lock_time, function(err, success) {
      callback(err, (success == 'OK'));
    });
  },

  releaseLock: function(lock_name, callback) {
    helpers.redis.del(lock_name + '_lock', callback);
  },

  pollLock: function(lock_name, danger_func, interval, max_lock_time, callback) {
    var function_executed = false;
    async.until(function() { return function_executed; }, function(cb) {
      setTimeout(function() {
        helpers.aquireLock(lock_name, max_lock_time, function(err, obtained) {
          if(err) { return cb(err); }
          if(!obtained) { return cb(null); }
          function_executed = true;
          danger_func(function(err) {
            if(err) { return cb(err); }
            helpers.releaseLock(lock_name, cb);
          });
        });
      }, interval);
    }, callback);
  },

  /**
  * initializes all mongoose models
  **/
  initModels: function() {
    var uri = config.mongoUri();

    // set keepAlive because azure's load balancer will kill idle connections
    var options = {
      server: {
        socketOptions: {
          keepAlive: 1,
          maxIdleTimeMS: 200000
        }
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
