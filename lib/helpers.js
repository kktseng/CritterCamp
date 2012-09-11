var redis = require('redis'),
    config = require('config');

module.exports = {
  redis: redis.createClient(config.Redis.port, config.Redis.host),
  publisher: redis.createClient(config.Redis.port, config.Redis.host),
  subscriber: redis.createClient(config.Redis.port, config.Redis.host)
};