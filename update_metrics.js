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
          if(err) { return console.warn(err.message); }
          return cb(null, count);
        });
      },
      function(count, cb) {
        redis_client.scard('game_stat_' + game_name + '_users', function(err, num_users) {
          if(err) { return console.warn(err.message); }
          return cb(null, count, num_users);
        });
      },
      function(count, num_users, cb) {
        redis_client.sdiff('game_stat_' + game_name + '_users', function(err, result) {
          if(err) { return console.warn(err.message); }
          return cb(null, count, num_users, result);
        });
      }
    ], function(err, count, num_users, result) {
      if(err) { return console.warn(err.message); }
      gamestat.insert({ name: game_name, date: Date.now(), totalPlays: count, uniqueUsers: num_users }, { safe: true }, callback);
    });
  };

  game.find({}).toArray(function(err, games) {
    async.forEach(games, updateGameMetrics, function(err) {
      if(err) { console.warn(err.message); }
      else { console.log('Update metrics success!'); }
      server.close();
    });
  });
});