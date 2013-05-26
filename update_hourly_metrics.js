var mongodb = require('mongodb'),
    config = require('./config/configuration'),
    redis = require('redis'),
    moment = require('moment'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async');

var redis_client = redis.createClient(config.file.Redis.port, config.file.Redis.host);

var host = config.file.Mongo.host;
var port = config.file.Mongo.port;
var db = config.file.Mongo.db;

var server = new mongodb.Server(host, port, {});
var database = new mongodb.Db(db, server, { w: 1 });

function doWork(client) {
  var hourlystat = new mongodb.Collection(client, "hourlystats");

  redis_client.get('connection_count', function(err, conn_count) {
    if(err) { return console.warn(err.message); }
    hourlystat.insert({ date: Date.now(), numConnections: conn_count }, function(err) {
      var time = moment().format('MM-DD-YYYY hh:mm:ss ');
      if(err) { console.warn(time + err.message); }
      else { console.log(time + 'Update hourly metrics success!'); }
      server.close();
      redis_client.quit();
    })
  });
}

database.open(function(error, client) {
  if(error) throw error;

  if(config.file.Mongo.username && config.file.Mongo.password) {
    database.authenticate(config.file.Mongo.username, config.file.Mongo.password, function(err, results) {
      if(err) throw err;
      doWork(client);
    });
  } else {
    doWork(client);
  }
});
