var mongodb = require('mongodb'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async'),
    config = require('config');;

var gameMap = {
  'twilight_tango': '1.0',
  'jetpack_jamboree': '1.0',
  'fishing_frenzy': '1.0'
};

var host = config.Mongo.host;
var port = config.Mongo.port;
var db = config.Mongo.db;

var server = new mongodb.Server(host, port, {});
var database = new mongodb.Db(db, server, { w: 1 });

function doWork(client) {
  var users = new mongodb.Collection(client, 'users');
  var games = new mongodb.Collection(client, 'games');

  var password_hash = bcrypt.hashSync('password', 12);

  users.update({ username: 'testuser1' }, {
    username: 'testuser1',
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
      async.forEach(Object.keys(gameMap), function(game, callback) {
        games.update({ name: game }, { name: game, minVersion: gameMap[game] }, { safe: true, upsert: true }, callback);
      }, function(err) {
        if(err) { console.warn(err.message); }
        else { console.log('Initialize test users success!'); }
        server.close(); // server needs to still be closed if there was an error
      });
    });
  });
}

database.open(function(error, client) {
  if(error) throw error;

  if(config.Mongo.username && config.Mongo.pasword) {
    database.authenticate(config.Mongo.username, config.Mongo.password, function(err, results) {
      if(err) throw err;
      doWork(client);
    });
  } else {
    doWork(client);
  }
});