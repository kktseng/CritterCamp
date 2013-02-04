var async = require('async'),
    users = require('../lib/users'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('Score System', function() {
  var user;

  beforeEach(function(done) {
    helpers.m.Rank.remove({}, function(err) {
      if(err) { return done(err); }
      factory.user(function(err, new_user) {
        if(err) { return done(err); }
        user = new_user;
        var ranks = [];
        ranks.push(new helpers.m.Rank({ rank: 1, level: 10 }));
        ranks.push(new helpers.m.Rank({ rank: 2, level: 9 }));
        ranks.push(new helpers.m.Rank({ rank: 3, level: 8 }));
        ranks.push(new helpers.m.Rank({ rank: 4, level: 7 }));
        ranks.push(new helpers.m.Rank({ rank: 5, level: 6 }));
        ranks.push(new helpers.m.Rank({ rank: 6, level: 5 }));
        ranks.push(new helpers.m.Rank({ rank: 7, level: 4 }));
        ranks.push(new helpers.m.Rank({ rank: 8, level: 3 }));
        ranks.push(new helpers.m.Rank({ rank: 9, level: 2 }));
        ranks.push(new helpers.m.Rank({ rank: 10, level: 1 }));
        async.forEach(ranks, function(rank, callb) {
          rank.save(callb);
        }, function(err) {
          if(err) { return done(err); }
          helpers.m.User.remove({ username: { $regex: 'ranked_user_.*', $options: 's' } }, function(err) {
            if(err) { return done(err); }
            var ranked_users = [];
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_1', level: 1 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_2', level: 2 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_3', level: 3 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_4', level: 4 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_5', level: 5 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_6', level: 6 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_7', level: 7 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_8', level: 8 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_9', level: 9 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_10', level: 10 }));
            async.forEach(ranked_users, function(ranked_user, cb) {
              ranked_user.save(cb);
            }, done);
          });
        });
      });
    });
  });

  it('can set exp and level correctly', function(done) {
    user.level = 5;
    async.waterfall([
      function(callback) {
        user.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        users.setExp(user.username, 6, callback);
      },
      function(callback) {
        helpers.m.User.getUser(user.username, callback);
      },
      function(updated_user, callback) {
        users.getRank(user.username, function(err, rank) {
          callback(err, updated_user, rank);
        });
      },
      function(updated_user, rank, callback) {
        rank.rank.should.equal(5);
        updated_user.exp.should.equal(6);
        updated_user.level.should.equal(6);
        helpers.m.Rank.getRank(5, callback);
      },
      function(rank_level_5, callback) {
        rank_level_5.rank.should.equal(6);
        helpers.m.Rank.getRank(1, callback);
      },
      function(rank_level_1, callback) {
        rank_level_1.rank.should.equal(10);
        callback(null);
      }
    ], function(err) {
      if(err) { return done(err); }
      done();
    });
  });
});

// edge case
// we assume each rank: level pair contains at least 1 user at that level
// what if no user is in that level?
/*
lvl 3: rank 1
lvl 2: ?
lvl 1: rank 2


*/