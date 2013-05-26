var mongodb = require('mongodb'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async'),
    config = require('./config/configuration');

var gameMap = {
  'twilight_tango': '1.0',
  'jetpack_jamboree': '1.0',
  'fishing_frenzy': '1.0'
};

var host = config.file.Mongo.host;
var port = config.file.Mongo.port;
var db = config.file.Mongo.db;

var server = new mongodb.Server(host, port, {});
var database = new mongodb.Db(db, server, { w: 1 });

function doWork(client) {
  var users = new mongodb.Collection(client, 'users');
  var games = new mongodb.Collection(client, 'games');
  var news = new mongodb.Collection(client, 'news');

  var password_hash = bcrypt.hashSync('password', 12);

  users.update({ username: 'testuser1' }, {
    username: 'testuser1',
    upperUsername: 'TESTUSER1',
    password: password_hash,
    email: 'testuser1@gmail.com', 
    profile: 'pig',
    friends: [],
    friendRequests: [],
    achievements: [],
    gold: 1000,
    exp: 0,
    level: 1,
    dateCreated: Date.now(),
    lastLogin: Date.now(),
    loginCount: 0,
    moneySpent: 0,
    totalGames: 0
  }, { safe: true, upsert: true }, function(err, result) {
    if(err) { console.warn(err.message); }
    users.update({ username: 'testuser2' }, { 
      username: 'testuser2',
      upperUsername: 'TESTUSER2',
      password: password_hash, 
      email: 'testuser2@gmail.com',
      profile: 'pig',
      friends: [],
      friendRequests: [],
      achievements: [],
      gold: 1000,
      exp: 0,
      level: 1,
      dateCreated: Date.now(),
      lastLogin: Date.now(),
      loginCount: 0,
      moneySpent: 0,
      totalGames: 0
    }, { safe: true, upsert: true }, function(err, result) {
      if(err) { console.warn(err.message); }
      async.each(Object.keys(gameMap), function(game, callback) {
        games.update({ name: game }, { name: game, minVersion: gameMap[game] }, { safe: true, upsert: true }, callback);
      }, function(err) {
        if(err) { console.warn(err.message); }
        news.stats(function(err, stats) {
          if(err) { console.warn(err.message); }
          if(stats.count === 0) {
            news.insert({ date: Date.now, post: 'Welcome to CritterCamp! Check us out on Facebook for more updates!' }, function(err, results) {
              if(err) { console.warn(err.message); }
              else { console.log('Initialize test users success!'); }
              server.close(); // server needs to still be closed if there was an error
            });
          } else {
            console.log('Initialize test users success!');
            server.close();
          }
        });
      });
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
