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
  }
};

if (config.file.Redis.db) {
  helpers.redis.select(config.file.Redis.db);
}