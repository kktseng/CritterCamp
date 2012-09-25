var config = require('config');

exports.file = config;

exports.mongoUri = function(user, pass, host, port, db) {
  if (config.Mongo.user && config.Mongo.pass) {
    return "mongodb://" + config.Mongo.user + ":" + config.Mongo.pass + "@" + config.Mongo.host + ":" + config.Mongo.port + "/" + config.Mongo.db;
  } else {
    return "mongodb://" + config.Mongo.host + ":" + config.Mongo.port + "/" + config.Mongo.db;
  }
}