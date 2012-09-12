var redis = require('redis'),
    config = require('config');

var helpers = module.exports = {
  
  // redis clients
  redis: redis.createClient(config.Redis.port, config.Redis.host),
  publisher: redis.createClient(config.Redis.port, config.Redis.host),
  subscriber: redis.createClient(config.Redis.port, config.Redis.host),
  
  createId: function(callback) {
    helpers.redis.multi()
      .incr('id_count')
      .get('id_count', function(err, group_id) {
        if(err) { return callback(err); }
        return callback(null, group_id);
      })
      .exec(function(err, reply) {
        if(err) { return callback(err); }
      }
    );
  }
};