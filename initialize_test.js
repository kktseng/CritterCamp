var mongodb = require('mongodb'),
    globals = require('./lib/globals'),
    bcrypt = require('bcrypt'),
    async = require('async');

var server = new mongodb.Server("127.0.0.1", 27017, {});
new mongodb.Db('pig_dev', server, {w: 1}).open(function (error, client) {
  if (error) throw error;
  var users = new mongodb.Collection(client, 'users');

  var password_hash = bcrypt.hashSync('password', 12);

  users.insert({ username: 'test_user1', password: password_hash, email: 'test_user1@gmail.com' }, { safe: true }, function(err, result) {
    if(err) { console.warn(err.message); }
    users.insert({ username: 'test_user2', password: password_hash, email: 'test_user2@gmail.com'}, { safe: true }, function(err, result) {
      if(err) { console.warn(err.message); }
      console.log('Initialize test users success!');
      server.close();
    });
  });

});