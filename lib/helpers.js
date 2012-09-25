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
  
  createId: function(callback) {
    helpers.redis.multi()
      .incr('id_count')
      .get('id_count', callback)
      .exec(function(err, reply) {
        if(err) { return callback(err); }
      }
    );
  },

  initModels: function() {
    var uri = config.mongoUri();
    logger.info('mongo dburi: ' + uri);
    mongoose.connect(uri);
    this.m = require('../models');
  }
};

if (config.file.Redis.db) {
  helpers.redis.select(config.file.Redis.db);
}