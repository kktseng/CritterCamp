var mongodb = require('mongodb'),
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

  var insert_username = function(username, cb) {
    users.insert({ username: username, password: username + '123', email: username + '@gmail.com', level: level_count }, { safe: true }, function(err, result) {
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
    function clear_users(callback) {
      users.remove({}, { safe: true }, function(err, result) {
        if(err) { console.warn(err.message); }
        callback();
      });
    },
    function insert_dummy_users(callback) {
      async.forEachSeries(usernames, insert_username, callback);
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
          ranks.insert({ level: level, rank: 11-level }, { safe: true }, function(err, results) {
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