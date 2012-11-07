var config = require('config');

exports.file = config;

exports.mongoUri = function() {
  if (config.Mongo.username && config.Mongo.password) {
    return "mongodb://" + config.Mongo.user + ":" + config.Mongo.pass + "@" + config.Mongo.host + ":" + config.Mongo.port + "/" + config.Mongo.db;
  } else {
    return "mongodb://" + config.Mongo.host + ":" + config.Mongo.port + "/" + config.Mongo.db;
  }
}