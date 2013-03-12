var mongodb = require('mongodb'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async');

var gameMap = {
  'twilight_tango': '1.0',
  'jetpack_jamboree': '1.0',
  'missle_madness': '1.0'
};

var server = new mongodb.Server("127.0.0.1", 27017, {});
new mongodb.Db('pig_dev', server, { w: 1 }).open(function(error, client) {
  if(error) throw error;
  var users = new mongodb.Collection(client, 'users');
  var games = new mongodb.Collection(client, 'games');

  var password_hash = bcrypt.hashSync('password', 12);

  users.update({ username: 'test_user1' }, {
    username: 'test_user1',
    password: password_hash,
    email: 'test_user1@gmail.com', 
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
    users.update({ username: 'test_user2' }, { 
      username: 'test_user2', 
      password: password_hash, 
      email: 'test_user2@gmail.com',
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

});