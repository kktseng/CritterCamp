var mongodb = require('mongodb'),
    globals = require('./lib/globals'),
    async = require('async');

var server = new mongodb.Server("127.0.0.1", 27017, {});
new mongodb.Db('pig_dev', server, {w: 1}).open(function (error, client) {
  if (error) throw error;
  var users = new mongodb.Collection(client, 'users');
  var ranks = new mongodb.Collection(client, 'ranks');
  var leaders = new mongodb.Collection(client, 'leaders');

  var level_count = 1;
  var leader_count = 10;

  var usernames = [ 'petewheeler', 'achmedkhan', 'angeladelvecchio', 'kieshaphillips', 'erniesteele',
                    'kennykawaguchi', 'markydubois', 'ashleywebber', 'sydneywebber', 'pablosanchez' ];

  var upsert_username = function(username, cb) {
    users.update({ username: username, password: username + '123', email: username + '@gmail.com' }, { $set: { level: level_count, exp: globals.EXP_TO_LEVEL[level_count-1] }}, { safe: true, upsert: true }, function(err, result) {
      if(err) { console.warn(err.message); }
      level_count++;
      cb();
    });
  };

  var insert_leader = function(username, cb) {
    users.find({ username: username }).nextObject(function(err, results) {
      if(err) { console.warn(err.message); }
      leaders.insert({ user: results._id, rank: leader_count }, { safe: true }, function(err, result) {
        if(err) { console.warn(err.message); }
        leader_count--;
        cb();
      });
    });
  };

  async.waterfall([
    function reset_users(callback) {
      users.update({}, { $set: { level: 1, exp: 0 }}, { safe: true, multi: true }, function(err, result) {
        if(err) { console.warn(err.message); }
        callback();
      });
    },
    function upsert_dummy_users(callback) {
      async.forEachSeries(usernames, upsert_username, callback);
    },
    function clear_ranks(callback) {
      ranks.remove({}, { safe: true }, function(err, result) {
        if(err) { console.warn(err.message); }
        callback();
      });
    },
    function insert_dummy_rank(callback) {
      for(var i = 1; i < 11; i++) {
        (function(level) {
          ranks.insert({ level: level, rank: 11-level, players: 1 }, { safe: true }, function(err, results) {
            if(err) { console.warn(err.message); }
          });
        })(i);
      }
      callback();
    },
    function clear_leaders(callback) {
      leaders.remove({}, { safe: true }, function(err, result) {
        if(err) { console.warn(err.message); }
        callback();
      });
    },
    function insert_dummy_leaders(callback) {
      async.forEachSeries(usernames, insert_leader, callback);
    }
  ], function(err) {
    if(err) { console.warn(err.message); }
    console.log('Reset ladder success!');
    server.close();
  });

});