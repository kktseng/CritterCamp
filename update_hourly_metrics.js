var mongodb = require('mongodb'),
    config = require('./config/configuration'),
    redis = require('redis'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async');

var redis_client = redis.createClient(config.file.Redis.port, config.file.Redis.host);

var server = new mongodb.Server("127.0.0.1", 27017, {});
new mongodb.Db('pig_dev', server, { w: 1 }).open(function(error, client) {
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