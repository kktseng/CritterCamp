var mongodb = require('mongodb'),
    async = require('async');

var server = new mongodb.Server("127.0.0.1", 27017, {});
new mongodb.Db('pig_dev', server, {w: 1}).open(function (error, client) {
  if (error) throw error;
  var users = new mongodb.Collection(client, 'users');
  var ranks = new mongodb.Collection(client, 'ranks');
  var leaders = new mongodb.Collection(client, 'leaders');

  var usernames = [ 'pablosanchez', 'petewheeler', 'achmedkhan', 'angeladelvecchio', 'kieshaphillips',
                    'kennykawaguchi', 'markydubois', 'erniesteele', 'ashleywebber', 'sydneywebber' ];

  var insert_username = function(username, cb) {
    console.log('insert');
    users.insert({ username: username, password: username + '123', email: username + '@gmail.com' }, { safe: true }, function(err, result) {
      if(err) { console.warn(err.message); }
      console.log('cb!?' + cb);
      return cb();
    });
  }

  async.waterfall([
    function(callback) {
      console.log('1');
      users.remove({}, callback);
    },
    function(callback) {
      console.log('2');
      async.forEach(usernames, insert_username, callback);
    },
    function(callback) {
      console.log('3');
      ranks.remove({}, callback);
    },
    function(callback) {
      console.log('4');
      ranks.insert({ rank: 1, level: 1}, { safe: true }, callback);
    },
    function(result, callback) {
      console.log('5');
      leaders.remove({}, callback);
    }
  ], function(err) {
    if(err) { console.warn(err.message); }
    console.log('Reset ladder success!');
  });
/*
  users.remove({});
  users.insert({ username: 'pablosanchez', password: 'pablosanchez123', email: 'pablosanchez@gmail.com' });
  users.insert({ username: 'petewheeler', password: 'petewheeler123', email: 'petewheeler@gmail.com' });
  users.insert({ username: 'achmedkhan', password: 'achmedkhan123', email: 'achmedkhan@gmail.com' });
  users.insert({ username: 'angeladelvecchio', password: 'angeladelvecchio123', email: 'angeladelvecchio@gmail.com' });
  users.insert({ username: 'kieshaphillips', password: 'kieshaphillips123', email: 'kieshaphillips@gmail.com' });
  users.insert({ username: 'kennykawaguchi', password: 'kennykawaguchi123', email: 'kennykawaguchi@gmail.com' });
  users.insert({ username: 'markydubois', password: 'markydubois123', email: 'markydubois@gmail.com' });
  users.insert({ username: 'erniesteele', password: 'erniesteele123', email: 'erniesteele@gmail.com' });
  users.insert({ username: 'ashleywebber', password: 'ashleywebber123', email: 'ashleywebber@gmail.com' });
  users.insert({ username: 'sydneywebber', password: 'sydneywebber123', email: 'sydneywebber@gmail.com' });

  ranks.remove({});
  ranks.insert({ rank: 1, level: 1}, { safe: true }, function(err, result) {
    if(err) { console.warn(err.message); }
    console.log('success!');
  });

  leaders.remove({});
  */

});