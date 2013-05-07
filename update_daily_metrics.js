var mongodb = require('mongodb'),
    config = require('./config/configuration'),
    redis = require('redis'),
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
  var game = new mongodb.Collection(client, "games");
  var gamestat = new mongodb.Collection(client, "gamestats");

  var updateGameMetrics = function updateGameMetrics(game_obj, callback) {
    var game_name = game_obj.name;

    async.waterfall([
      function(cb) {
        redis_client.get('game_stat_' + game_name + '_count', cb);
      },
      function(count, cb) {
        redis_client.set('game_stat_' + game_name + '_count', 0, function(err) {
          if(err) { return cb(err); }
          return cb(null, count);
        });
      },
      function(count, cb) {
        redis_client.scard('game_stat_' + game_name + '_users', function(err, num_users) {
          if(err) { return cb(err); }
          return cb(null, count, num_users);
        });
      },
      function(count, num_users, cb) {
        redis_client.sdiff('game_stat_' + game_name + '_users', function(err, result) {
          if(err) { return cb(err); }
          return cb(null, count, num_users, result);
        });
      }
    ], function(err, count, num_users, result) {
      if(err) { return callback(err); }
      gamestat.insert({ name: game_name, date: Date.now(), totalPlays: count, uniqueUsers: num_users }, { safe: true }, callback);
    });
  };

  game.find({}).toArray(function(err, games) {
    async.forEach(games, updateGameMetrics, function(err) {
      if(err) { console.warn(err.message); }
      else { console.log('Update daily metrics success!'); }
      server.close();
      redis_client.quit();
    });
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
