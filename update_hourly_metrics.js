var mongodb = require('mongodb'),
    config = require('./config/configuration'),
    redis = require('redis'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async');

var redis_client = redis.createClient(config.file.Redis.port, config.file.Redis.host);

var host = config.Mongo.host;
var port = config.Mongo.port;
var db = config.Mongo.db;

var server = new mongodb.Server(host, port, {});
new mongodb.Db(db, server, { w: 1 }).open(function(error, client) {
  if(error) throw error;

  var hourlystat = new mongodb.Collection(client, "hourlystats");

  redis_client.get('connections_count', function(err, conn_count) {
    if(err) { return console.warn(err.message); }
    hourlystat.insert({ date: Date.now(), numConnections: conn_count }, function(err) {
      if(err) { console.warn(err.message); }
      else { console.log('Update hourly metrics success!'); }
      server.close();
    })
  });

});